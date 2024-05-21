import createClient from 'openapi-fetch';
import { paths } from '../internal/schema.generated.js';
import base32Decode from 'base32-decode';
import { API_KEY_PAK_PREFIX, USER_AGENT } from '../../constants.js';
import { getApiKeyInformation } from './getApiKeyInformation.js';
import { debug } from '../../utils/logger.js';

function projectIdFromKey(key: string) {
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
  apiKey: string;
  projectId?: number | undefined;
};

export function createApiClient({
  baseUrl,
  apiKey,
  projectId,
}: ApiClientProps) {
  const computedProjectId = projectId ?? projectIdFromKey(apiKey);
  const apiClient = createClient<paths>({
    baseUrl,
    headers: {
      'user-agent': USER_AGENT,
      'x-api-key': apiKey,
    },
  });

  apiClient.use({
    onRequest: (req) => {
      debug(`[HTTP] Requesting: ${req.method} ${req.url}`);
      return undefined;
    },
    onResponse: (res) => {
      debug(`[HTTP] Response: ${res.url} [${res.status}]`);
      return undefined;
    },
  });

  return {
    ...apiClient,
    getProjectId() {
      return computedProjectId!;
    },
    getApiKeyInfo() {
      return getApiKeyInformation(apiClient, apiKey);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
