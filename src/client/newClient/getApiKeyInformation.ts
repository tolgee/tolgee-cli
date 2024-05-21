import { API_KEY_PAK_PREFIX } from '../../constants.js';
import { ApiKeyInfo } from '../index.js';
import { errorFromLoadable } from './errorFromLoadable.js';
import createClient from 'openapi-fetch';
import { paths } from '../internal/schema.generated.js';
import { error } from '../../utils/logger.js';

export const getApiKeyInformation = async (
  client: ReturnType<typeof createClient<paths>>,
  key: string
): Promise<ApiKeyInfo> => {
  if (key.startsWith(API_KEY_PAK_PREFIX)) {
    const loadable = await client.GET('/v2/api-keys/current');

    if (loadable.error) {
      if (loadable.response.status === 401) {
        error("Couldn't log in: the API key you provided is invalid.");
      } else {
        error(errorFromLoadable(loadable));
      }
      process.exit(1);
    }
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
    console.log({ loadable });
    if (loadable.error) {
      console.log(loadable.response);
      if (loadable.response.status === 401) {
        error("Couldn't log in: the API key you provided is invalid.");
      } else {
        error(errorFromLoadable(loadable));
      }
      process.exit(1);
    }

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
