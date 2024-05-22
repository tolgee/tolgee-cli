import createClient from 'openapi-fetch';

import { API_KEY_PAK_PREFIX } from './../constants.js';
import { paths } from './internal/schema.generated.js';
import { handleLoadableError } from './TolgeeClient.js';
import { exitWithError } from './../utils/logger.js';

export type ApiKeyInfoPat = {
  type: 'PAT';
  key: string;
  username: string;
  expires: number;
};

export type ApiKeyInfoPak = {
  type: 'PAK';
  key: string;
  username: string;
  project: { id: number; name: string };
  expires: number;
};

export type ApiKeyInfo = ApiKeyInfoPat | ApiKeyInfoPak;

export const getApiKeyInformation = async (
  client: ReturnType<typeof createClient<paths>>,
  key: string
): Promise<ApiKeyInfo> => {
  if (key.startsWith(API_KEY_PAK_PREFIX)) {
    const loadable = await client.GET('/v2/api-keys/current');
    if (loadable.response.status === 401) {
      exitWithError("Couldn't log in: the API key you provided is invalid.");
    }
    handleLoadableError(loadable);

    const info = loadable.data!;
    const username = info.userFullName || info.username || '<unknown user>';

    return {
      type: 'PAK',
      key: key,
      username: username,
      project: {
        id: info.projectId,
        name: info.projectName,
      },
      expires: info.expiresAt ?? 0,
    };
  } else {
    const loadable = await client.GET('/v2/pats/current');
    if (loadable.response.status === 401) {
      exitWithError("Couldn't log in: the API key you provided is invalid.");
    }
    handleLoadableError(loadable);

    const info = loadable.data!;
    const username = info.user.name || info.user.username;

    return {
      type: 'PAT',
      key: key,
      username: username,
      expires: info.expiresAt ?? 0,
    };
  }
};
