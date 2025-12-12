import { debug, error } from '../logger.js';
import { isVersionAtLeast } from '../isVersionAtLeast.js';
import { createTolgeeClient } from '../../client/TolgeeClient.js';

export function AuthErrorHandler(
  client: ReturnType<typeof createTolgeeClient>
) {
  async function handleAuthErrors(err: any, shutdown: () => void) {
    if (err?.headers?.message == 'Unauthenticated') {
      await printUnauthenticatedError();
    }
    if (err?.headers?.message == 'Unauthorized') {
      error("You're not authorized. Insufficient permissions?");
    }
    shutdown();
  }

  async function printUnauthenticatedError() {
    const { isSupported, serverVersion } = await isAppSupportedVersion(client);

    console.log({ isSupported, serverVersion });
    if (isSupported) {
      error("You're not authenticated. Invalid API key?");
      return;
    }
    error(
      `Server version ${serverVersion} does not support CLI watch mode. Please update your Tolgee server to version ${REQUIRED_VERSION} or higher.`
    );
    return;
  }

  async function isAppSupportedVersion(
    client: ReturnType<typeof createTolgeeClient>
  ) {
    const serverVersion = await getTolgeeServerVersion(client);

    if (!serverVersion) {
      debug('Could not determine server version');
      return {
        isSupported: false,
        serverVersion: serverVersion,
      };
    }

    return {
      isSupported: isVersionAtLeast(REQUIRED_VERSION, serverVersion),
      serverVersion: serverVersion,
    };
  }

  async function getTolgeeServerVersion(
    client: ReturnType<typeof createTolgeeClient>
  ): Promise<string | null> {
    try {
      const config = await client.GET('/api/public/configuration');
      const version = config.response?.headers.get('x-tolgee-version');
      return version || null;
    } catch (error) {
      debug('Failed to get server version: ' + error);
      return null;
    }
  }

  return Object.freeze({ handleAuthErrors });
}

const REQUIRED_VERSION = '3.143.0';
