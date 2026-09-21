import type { paths } from './internal/schema.generated.js';

import createClient, { ParseAs } from 'openapi-fetch';
import base32Decode from 'base32-decode';
import { API_KEY_PAK_PREFIX, USER_AGENT } from '../constants.js';
import { getApiKeyInformation } from './getApiKeyInformation.js';
import { debug, isDebugEnabled } from '../utils/logger.js';
import { errorFromLoadable } from './errorFromLoadable.js';
import { normalizeHeaderKeys } from '../utils/headers.js';

// Headers the CLI controls and that custom headers must never override.
const RESERVED_HEADERS = ['user-agent', 'content-type', 'x-api-key'];

async function parseResponse(response: Response, parseAs: ParseAs) {
  // handle empty content
  // note: we return `{}` because we want user truthy checks for `.data` or `.error` to succeed
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
  /** Read per request rather than captured, so a token rotated mid-command is the one that gets sent. */
  getAccessToken?: () => string | undefined;
  /** Given the token that was refused, answers whether the request is worth sending again. */
  onUnauthorized?: (usedToken: string) => Promise<boolean>;
  projectId?: number | undefined;
  autoThrow?: boolean;
  headers?: Record<string, string>;
};

export function createApiClient({
  baseUrl,
  apiKey,
  getAccessToken,
  onUnauthorized,
  projectId,
  autoThrow = false,
  headers,
}: ApiClientProps) {
  const computedProjectId =
    projectId ?? (apiKey ? projectIdFromKey(apiKey) : undefined);

  const custom = normalizeHeaderKeys(headers);
  const ignored = RESERVED_HEADERS.filter((name) => name in custom);
  if (ignored.length) {
    debug(`[HTTP] Ignoring reserved custom header(s): ${ignored.join(', ')}`);
  }
  for (const name of ignored) {
    delete custom[name];
  }

  // An explicitly supplied authorization header outranks a stored session, the same way --api-key does.
  const hasCustomAuthorization = 'authorization' in custom;

  function authorized(request: Request) {
    const token = hasCustomAuthorization ? undefined : getAccessToken?.();
    if (!token) {
      return { request, token: undefined };
    }
    const authorizedRequest = new Request(request);
    authorizedRequest.headers.set('authorization', `Bearer ${token}`);
    return { request: authorizedRequest, token };
  }

  // The access token is applied here rather than in middleware so that the replay below carries the token the
  // refresh produced, not the one that was just refused.
  async function fetchWithAuth(request: Request): Promise<Response> {
    const attempt = authorized(request.clone());
    const response = await fetch(attempt.request);

    if (response.status !== 401 || !onUnauthorized || !attempt.token) {
      return response;
    }
    if (!(await onUnauthorized(attempt.token))) {
      return response;
    }

    debug('[HTTP] Retrying with a refreshed access token');
    return fetch(authorized(request.clone()).request);
  }

  const apiClient = createClient<paths>({
    baseUrl,
    fetch: fetchWithAuth,
    headers: {
      ...custom,
      'user-agent': USER_AGENT,
      'x-api-key': apiKey,
    },
  });

  apiClient.use({
    onRequest: ({ request }) => {
      debug(`[HTTP] Requesting: ${request.method} ${request.url}`);
    },
    onResponse: async ({ response, options }) => {
      let responseText = `[HTTP] Response: ${response.url} [${response.status}]`;
      const apiVersion = response.headers.get('x-tolgee-version');
      if (apiVersion) {
        responseText += ` [${response.headers.get('x-tolgee-version')}]`;
      }
      if (!response.ok && isDebugEnabled()) {
        const clonedBody = await response.clone().text();
        if (clonedBody) {
          responseText += ` [${clonedBody}]`;
        }
      }
      debug(responseText);
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
    // Complete enough to build an equivalent client from: leaving the credential out would hand back one that
    // authenticates with nothing for a user logged in through the browser.
    getSettings(): ApiClientProps {
      return {
        baseUrl,
        apiKey,
        getAccessToken,
        onUnauthorized,
        projectId,
        autoThrow,
        headers,
      };
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
