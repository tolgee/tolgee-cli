import type { paths } from './internal/schema.generated.js';

import createClient, { type Client, ParseAs } from 'openapi-fetch';
import base32Decode from 'base32-decode';
import { API_KEY_PAK_PREFIX, USER_AGENT } from '../constants.js';
import { getApiKeyInformation } from './getApiKeyInformation.js';
import { debug, isDebugEnabled, warn } from '../utils/logger.js';
import { errorFromLoadable } from './errorFromLoadable.js';
import { normalizeHeaderKeys } from '../utils/headers.js';
import type { OAuthSessionHandle } from '../oauth/session.js';
import { authenticatingFetch } from './credential.js';
import { CLI_SCOPES } from '../oauth/constants.js';

// Headers the CLI controls and that custom headers must never override.
const RESERVED_HEADERS = ['user-agent', 'content-type', 'x-api-key'];

async function parseResponse(response: Response, parseAs: ParseAs) {
  // handle empty content
  // note: we return `{}` because we want user truthy checks for `.data` or
  // `.error` to succeed
  if (
    response.status === 204 ||
    response.headers.get('Content-Length') === '0'
  ) {
    return response.ok ? { data: {}, response } : { error: {}, response };
  }

  // parse response (falling back to .text() when necessary)
  if (response.ok) {
    // if "stream", skip parsing entirely
    if (parseAs === 'stream') {
      return { data: response.body, response };
    }
    return { data: await response[parseAs](), response };
  }

  // handle errors
  let error = await response.text();
  try {
    error = JSON.parse(error); // attempt to parse as JSON
  } catch {
    // noop
  }
  return { error, response };
}

export function projectIdFromKey(key: string) {
  if (!key.startsWith(API_KEY_PAK_PREFIX)) {
    return undefined;
  }

  const keyBuffer = base32Decode(
    key.slice(API_KEY_PAK_PREFIX.length).toUpperCase(),
    'RFC4648'
  );

  const decoded = Buffer.from(keyBuffer).toString('utf8');
  return Number(decoded.split('_')[0]);
}

export type ApiClientProps = {
  baseUrl: string;
  apiKey?: string;
  session?: OAuthSessionHandle;
  projectId?: number | undefined;
  autoThrow?: boolean;
  headers?: Record<string, string>;
};

export function createApiClient({
  baseUrl,
  apiKey,
  session,
  projectId,
  autoThrow = false,
  headers,
}: ApiClientProps) {
  const computedProjectId =
    projectId ?? (apiKey ? projectIdFromKey(apiKey) : undefined);

  const custom = withoutReservedHeaders(headers);
  const activeSession = sessionUnlessAuthorizationOverridden(custom, session);

  const apiClient = createClient<paths>({
    baseUrl,
    fetch: authenticatingFetch({ apiKey, session: activeSession }),
    headers: {
      ...custom,
      'user-agent': USER_AGENT,
    },
  });

  apiClient.use({
    onRequest: ({ request }) => {
      debug(`[HTTP] Requesting: ${request.method} ${request.url}`);
    },
    onResponse: async ({ request, response, options }) => {
      await logResponse(response);
      if (response.status === 403 && activeSession) {
        await hintAtScopesTheSessionLacks(
          apiClient,
          request.url,
          computedProjectId
        );
      }
      if (autoThrow && !response.ok) {
        const loadable = await parseResponse(response, options.parseAs);
        throw new Error(
          `Tolgee request error ${response.url} ${errorFromLoadable(
            loadable as any
          )}`
        );
      }
    },
  });

  return {
    ...apiClient,
    getProjectId() {
      return computedProjectId!;
    },
    getApiKeyInfo() {
      return getApiKeyInformation(apiClient, apiKey!);
    },
    getSettings(): ApiClientProps {
      return { baseUrl, apiKey, session, projectId, autoThrow, headers };
    },
  };
}

function withoutReservedHeaders(headers: Record<string, string> | undefined) {
  const custom = normalizeHeaderKeys(headers);
  const ignored = RESERVED_HEADERS.filter((name) => name in custom);
  if (ignored.length) {
    debug(`[HTTP] Ignoring reserved custom header(s): ${ignored.join(', ')}`);
  }
  for (const name of ignored) {
    delete custom[name];
  }
  return custom;
}

/** A custom `authorization` header turns the browser login off for this client. */
function sessionUnlessAuthorizationOverridden(
  custom: Record<string, string>,
  session: OAuthSessionHandle | undefined
) {
  if (!('authorization' in custom)) {
    return session;
  }
  if (session) {
    warn(
      'A custom authorization header replaces your browser login, so requests go out without it.'
    );
  }
  return undefined;
}

async function logResponse(response: Response) {
  let responseText = `[HTTP] Response: ${response.url} [${response.status}]`;
  const apiVersion = response.headers.get('x-tolgee-version');
  if (apiVersion) {
    responseText += ` [${apiVersion}]`;
  }
  if (!response.ok && isDebugEnabled()) {
    const clonedBody = await response.clone().text();
    if (clonedBody) {
      responseText += ` [${clonedBody}]`;
    }
  }
  debug(responseText);
}

const PERMISSIONS_PATH = '/v2/api-keys/current-permissions';

/**
 * `userScopes` is what the account may do on the project and `scopes` what this
 * session may, so the gap between them is what a fresh login would add.
 */
async function hintAtScopesTheSessionLacks(
  apiClient: Client<paths>,
  forbiddenUrl: string,
  projectId: number | undefined
) {
  if (forbiddenUrl.includes(PERMISSIONS_PATH)) {
    return;
  }
  try {
    const { data } = await apiClient.GET(PERMISSIONS_PATH, {
      params: { query: projectId === undefined ? {} : { projectId } },
    });
    const lacking = (data?.userScopes ?? []).filter(
      (scope) => CLI_SCOPES.includes(scope) && !data!.scopes.includes(scope)
    );
    if (!lacking.length) {
      return;
    }
    warn(
      `Your account has ${lacking.join(', ')} on this project, but your browser login does not. Run \`tolgee login\` again to approve it.`
    );
  } catch (e: any) {
    debug(
      `[HTTP] Could not compare the session with the account: ${e.message}`
    );
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;
