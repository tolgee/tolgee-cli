import {
  clearUserCredentials,
  getStoredCredentials,
  saveOAuthSession,
  type OAuthSession,
} from '../config/credentials.js';
import { withStoreLock } from '../config/storeLock.js';
import { debug, exitWithError } from '../utils/logger.js';
import {
  fetchAuthServerMetadata,
  OAuthError,
  refreshTokens,
  type AuthServerMetadata,
} from './authServer.js';
import { CLI_CLIENT_ID } from './constants.js';

/** Refreshed this long before it expires, so a request that takes a while does not start with a dying token. */
const REFRESH_MARGIN_MS = 60_000;

export type OAuthSessionHandle = {
  getAccessToken(): string;
  getUserName(): string | undefined;
  /** Rotates the pair when the access token is about to expire. */
  ensureFresh(): Promise<void>;
  /** Answers whether the request that got a 401 is worth sending again. */
  refreshAfterUnauthorized(usedToken: string): Promise<boolean>;
};

export function createOAuthSessionHandle(
  apiUrl: URL,
  initial: OAuthSession
): OAuthSessionHandle {
  let current = initial;
  let metadata: AuthServerMetadata | undefined;
  let inFlight: Promise<void> | undefined;

  async function metadataFor() {
    metadata ??= await fetchAuthServerMetadata(apiUrl);
    return metadata;
  }

  async function rotate() {
    // Another process may have rotated while this one waited for the lock, which makes its own refresh token the
    // spent one. Reading the store again inside the lock is what lets the loser carry on with the winner's pair
    // instead of replaying a token the server has already retired.
    const stored = await getStoredCredentials(apiUrl.toString(), -1);
    if (!stored || stored.type !== 'oauth') {
      sessionGone();
    }
    if (stored.session.refreshToken !== current.refreshToken) {
      debug('[OAUTH] Another process rotated the session; using its tokens');
      current = stored.session;
      return;
    }

    let tokens;
    try {
      tokens = await refreshTokens(await metadataFor(), {
        clientId: CLI_CLIENT_ID,
        refreshToken: current.refreshToken,
      });
    } catch (e) {
      // The server refusing the grant is terminal: the token is spent, revoked, or the grant is gone.
      if (e instanceof OAuthError && e.kind === 'oauth') {
        await clearUserCredentials(apiUrl);
        sessionGone();
      }
      throw e;
    }

    current = {
      type: 'oauth',
      accessToken: tokens.accessToken,
      accessExpires: tokens.accessExpires,
      refreshToken: tokens.refreshToken,
      userName: current.userName,
    };
    await saveOAuthSession(apiUrl, current);
  }

  function refresh() {
    inFlight ??= withStoreLock(rotate).finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  }

  return {
    getAccessToken: () => current.accessToken,

    getUserName: () => current.userName,

    async ensureFresh() {
      if (current.accessExpires - Date.now() > REFRESH_MARGIN_MS) {
        return;
      }
      await refresh();
    },

    async refreshAfterUnauthorized(usedToken) {
      // Something already replaced the token this request went out with, so it is worth sending again as it is.
      if (current.accessToken !== usedToken) {
        return true;
      }

      await refresh();
      return current.accessToken !== usedToken;
    },
  };
}

function sessionGone(): never {
  return exitWithError(
    'Your Tolgee session has expired. Run `tolgee login` to sign in again.'
  );
}
