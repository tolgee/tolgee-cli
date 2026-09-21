import {
  isOAuthSession,
  loadStore,
  type OAuthSession,
} from '../config/credentials.js';
import { debug, warn } from '../utils/logger.js';
import { fetchAuthServerMetadata, revokeToken } from './authServer.js';
import { CLI_CLIENT_ID } from './constants.js';

/**
 * Ends the grant on the server. Best effort throughout: logging out has to clear the machine even when the instance
 * is unreachable, and a session that outlives its local copy still expires on its own.
 */
async function revokeSession(apiUrl: URL, session: OAuthSession) {
  try {
    const metadata = await fetchAuthServerMetadata(apiUrl);
    // Revoking either token drops the whole grant, so the refresh token alone ends the session.
    await revokeToken(metadata, {
      clientId: CLI_CLIENT_ID,
      token: session.refreshToken,
    });
    debug(`[OAUTH] Revoked the session on ${apiUrl.hostname}`);
  } catch (e: any) {
    warn(`Could not end the session on ${apiUrl.hostname}: ${e.message}`);
  }
}

export async function revokeSessionFor(apiUrl: URL) {
  const host = (await loadStore())[apiUrl.hostname];
  if (host?.user && isOAuthSession(host.user)) {
    await revokeSession(apiUrl, host.user);
  }
}

export async function revokeAllSessions() {
  const store = await loadStore();

  for (const [hostname, host] of Object.entries(store)) {
    if (!host.user || !isOAuthSession(host.user)) {
      continue;
    }

    const apiUrl = host.user.apiUrl;
    if (!apiUrl) {
      warn(
        `Could not end the session on ${hostname}: the instance URL was not recorded. It expires on its own.`
      );
      continue;
    }

    await revokeSession(new URL(apiUrl), host.user);
  }
}
