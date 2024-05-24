import createClient, { ParseAs } from 'openapi-fetch';
import { paths } from './internal/schema.generated.js';
import base32Decode from 'base32-decode';
import { API_KEY_PAK_PREFIX, USER_AGENT } from '../constants.js';
import { getApiKeyInformation } from './getApiKeyInformation.js';
import { debug } from '../utils/logger.js';
import { errorFromLoadable } from './errorFromLoadable.js';

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
  projectId?: number | undefined;
  autoThrow?: boolean;
};

export function createApiClient({
  baseUrl,
  apiKey,
  projectId,
  autoThrow = false,
}: ApiClientProps) {
  const computedProjectId =
    projectId ?? (apiKey ? projectIdFromKey(apiKey) : undefined);
  const apiClient = createClient<paths>({
    baseUrl,
    headers: {
      'user-agent': USER_AGENT,
      'x-api-key': apiKey,
    },
  });

  apiClient.use({
    onRequest: (req, options) => {
      debug(`[HTTP] Requesting: ${req.method} ${req.url}`);
      return undefined;
    },
    onResponse: async (res, options) => {
      debug(`[HTTP] Response: ${res.url} [${res.status}]`);
      if (autoThrow && !res.ok) {
        const loadable = await parseResponse(res, options.parseAs);
        throw new Error(
          `Tolgee request error ${res.url} ${errorFromLoadable(
            loadable as any
          )}`
        );
      }
      return undefined;
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
