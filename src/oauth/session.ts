import {
  getHostCredentials,
  usableSession,
  updateHostCredentials,
  type HostCredentials,
  type OAuthSession,
} from '../config/credentials.js';
import { debug } from '../utils/logger.js';
import {
  fetchAuthServerMetadata,
  OAuthError,
  refreshTokens,
  type AuthServerMetadata,
} from './authServer.js';
import { CLI_CLIENT_ID } from './constants.js';

const REFRESH_MARGIN_MS = 60_000;

/**
 * How long a refused refresh waits for another process to store the pair it
 * rotated to. That process has the server's answer already; only its file write
 * is still on the way.
 */
const ADOPT_ATTEMPTS = 5;
const ADOPT_RETRY_MS = 200;

/**
 * `refreshed` cost a round trip to the server; `adopted` took tokens another
 * process or caller had already obtained.
 */
export type RefreshOutcome = 'refreshed' | 'adopted';

export type OAuthSessionHandle = {
  getAccessToken(): string;
  getProjectId(): number | undefined;
  ensureFresh(): Promise<void>;
  /** Rejects with SessionExpiredError once the grant is dead. */
  refreshAfterUnauthorized(usedToken: string): Promise<RefreshOutcome>;
  adoptNewerSession(): Promise<boolean>;
};

export function createOAuthSessionHandle(
  apiUrl: URL,
  initial: OAuthSession,
  extraHeaders?: Record<string, string>
): OAuthSessionHandle {
  let current = initial;
  let metadata: AuthServerMetadata | undefined;
  let inFlight: Promise<RefreshOutcome> | undefined;

  async function metadataFor() {
    metadata ??= await fetchAuthServerMetadata(apiUrl, extraHeaders);
    return metadata;
  }

  async function storedUsableSession() {
    const host = (await getHostCredentials(apiUrl)) ?? {};
    return usableSession(host, apiUrl);
  }

  async function rotate(): Promise<RefreshOutcome | 'gone'> {
    const server = await metadataFor();
    const stored = await storedUsableSession();
    if (!stored) {
      return 'gone';
    }
    if (stored.refreshToken !== current.refreshToken) {
      debug('[OAUTH] Another process rotated the session; using its tokens');
      current = stored;
      return 'adopted';
    }

    const rotated = await rotatedFrom(server, stored);
    if (rotated) {
      return storeRotated(stored, rotated);
    }

    const adopted = await adoptPairRotatedElsewhere(stored);
    if (adopted) {
      return 'adopted';
    }
    await forgetIfStillStored(stored);
    return 'gone';
  }

  async function rotatedFrom(
    server: AuthServerMetadata,
    stored: OAuthSession
  ): Promise<OAuthSession | null> {
    try {
      const tokens = await refreshTokens(
        server,
        { clientId: CLI_CLIENT_ID, refreshToken: stored.refreshToken },
        extraHeaders
      );
      return {
        ...stored,
        accessToken: tokens.accessToken,
        accessExpires: tokens.accessExpires,
        refreshToken: tokens.refreshToken,
        scopes: tokens.scopes.length ? tokens.scopes : stored.scopes,
        projectId: tokens.projectId ?? stored.projectId,
      };
    } catch (e) {
      if (e instanceof OAuthError && e.kind === 'oauth') {
        return null;
      }
      throw e;
    }
  }

  /**
   * A session stored while the refresh was in flight can only be a new login,
   * which also ends the grant the rotated pair belongs to.
   */
  function storeRotated(stored: OAuthSession, rotated: OAuthSession) {
    return updateHostCredentials(apiUrl, async (host: HostCredentials) => {
      const now = usableSession(host, apiUrl);
      if (now && now.refreshToken !== stored.refreshToken) {
        debug(
          '[OAUTH] Another process stored a newer session; using its tokens'
        );
        current = now;
        return { result: 'adopted' as const };
      }
      current = rotated;
      return { next: { ...host, user: rotated }, result: 'refreshed' as const };
    });
  }

  /**
   * The server refuses a refresh token it has just rotated for another process.
   * That process stores the new pair right after, so the refusal is read as a
   * reason to look for it, not as the end of the session.
   */
  async function adoptPairRotatedElsewhere(refused: OAuthSession) {
    for (let attempt = 1; attempt <= ADOPT_ATTEMPTS; attempt++) {
      const stored = await storedUsableSession();
      if (stored && stored.refreshToken !== refused.refreshToken) {
        debug('[OAUTH] Another process rotated the session; using its tokens');
        current = stored;
        return true;
      }
      if (attempt < ADOPT_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, ADOPT_RETRY_MS));
      }
    }
    return false;
  }

  function forgetIfStillStored(dead: OAuthSession) {
    return updateHostCredentials(apiUrl, async (host: HostCredentials) => {
      const now = usableSession(host, apiUrl);
      if (!now || now.refreshToken !== dead.refreshToken) {
        return { result: undefined };
      }
      return { next: { ...host, user: undefined }, result: undefined };
    });
  }

  function refresh() {
    inFlight ??= rotate()
      .then((outcome) => {
        if (outcome === 'gone') {
          throw new SessionExpiredError();
        }
        return outcome;
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  }

  return {
    getAccessToken: () => current.accessToken,

    getProjectId: () => current.projectId,

    async ensureFresh() {
      if (current.accessExpires - Date.now() > REFRESH_MARGIN_MS) {
        return;
      }
      await refresh();
    },

    async refreshAfterUnauthorized(usedToken) {
      if (current.accessToken !== usedToken) {
        return 'adopted';
      }
      return refresh();
    },

    async adoptNewerSession() {
      const stored = await storedUsableSession();
      if (!stored || stored.refreshToken === current.refreshToken) {
        return false;
      }
      debug('[OAUTH] Another process stored a newer session; using its tokens');
      current = stored;
      return true;
    },
  };
}

export class SessionExpiredError extends Error {
  constructor() {
    super(
      'Your Tolgee session has expired. Run `tolgee login` to sign in again.'
    );
    this.name = 'SessionExpiredError';
  }
}
