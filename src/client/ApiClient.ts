import type { paths } from './internal/schema.generated.js';

import createClient, { ParseAs } from 'openapi-fetch';
import base32Decode from 'base32-decode';
import { API_KEY_PAK_PREFIX, USER_AGENT } from '../constants.js';
import { getApiKeyInformation } from './getApiKeyInformation.js';
import { debug, isDebugEnabled, warn } from '../utils/logger.js';
import { errorFromLoadable } from './errorFromLoadable.js';
import { normalizeHeaderKeys } from '../utils/headers.js';
import type { OAuthSessionHandle } from '../oauth/session.js';
import { authenticatingFetch } from './credential.js';

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

  const { custom, activeSession } = customHeaderPolicy(headers, session);

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
    onResponse: async ({ response, options }) => {
      await logResponse(response);
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

function customHeaderPolicy(
  headers: Record<string, string> | undefined,
  session: OAuthSessionHandle | undefined
) {
  const custom = normalizeHeaderKeys(headers);
  const ignored = RESERVED_HEADERS.filter((name) => name in custom);
  if (ignored.length) {
    debug(`[HTTP] Ignoring reserved custom header(s): ${ignored.join(', ')}`);
  }
  for (const name of ignored) {
    delete custom[name];
  }

  const authorizationOverridden = 'authorization' in custom;
  if (authorizationOverridden && session) {
    warn(
      'A custom authorization header replaces your browser login, so requests go out without it.'
    );
  }
  return {
    custom,
    activeSession: authorizationOverridden ? undefined : session,
  };
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

export type ApiClient = ReturnType<typeof createApiClient>;
