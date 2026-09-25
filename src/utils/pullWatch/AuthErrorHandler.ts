import { debug, error } from '../logger.js';
import { SessionExpiredError } from '../../oauth/session.js';
import { isVersionAtLeast } from '../isVersionAtLeast.js';
import { createTolgeeClient } from '../../client/TolgeeClient.js';

export function AuthErrorHandler(
  client: ReturnType<typeof createTolgeeClient>,
  options: { renewCredential?: () => Promise<boolean> } = {}
) {
  async function handleAuthErrors(err: any, shutdown: (code?: number) => void) {
    if (err?.headers?.message == 'Unauthenticated') {
      try {
        if (await options.renewCredential?.()) {
          debug('Reconnecting with a renewed credential.');
          return;
        }
      } catch (e: any) {
        if (e instanceof SessionExpiredError) {
          error(e.message);
          shutdown(1);
          return;
        }
        debug(`Could not renew the credential: ${e.message}`);
        return;
      }
      await printUnauthenticatedError();
      shutdown(1);
      return;
    }
    if (err?.headers?.message == 'Forbidden') {
      error("You're not authorized. Insufficient permissions?");
      shutdown(1);
      return;
    }
  }

  async function printUnauthenticatedError() {
    const { isSupported, serverVersion } = await isAppSupportedVersion();
    if (isSupported) {
      error("You're not authenticated. Invalid credentials?");
      return;
    }
    error(
      `Server version ${serverVersion} does not support CLI watch mode. Please update your Tolgee server to version ${REQUIRED_VERSION} or higher.`
    );
  }

  async function isAppSupportedVersion() {
    const serverVersion = await getTolgeeServerVersion();

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

  async function getTolgeeServerVersion(): Promise<string | null> {
    try {
      const config = await client.GET('/api/public/configuration');
      const version = config.response?.headers.get('x-tolgee-version');
      return version || null;
    } catch (e) {
      debug('Failed to get server version: ' + e);
      return null;
    }
  }

  return Object.freeze({ handleAuthErrors });
}

const REQUIRED_VERSION = '3.143.0';
