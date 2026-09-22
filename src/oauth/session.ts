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

  async function rotate() {
    const server = await metadataFor();

    return updateHostCredentials(apiUrl, async (host: HostCredentials) => {
      const stored = usableSession(host, apiUrl);
      if (!stored) {
        return { result: 'gone' as const };
      }
      if (stored.refreshToken !== current.refreshToken) {
        debug('[OAUTH] Another process rotated the session; using its tokens');
        current = stored;
        return { result: 'adopted' as const };
      }

      const rotated = await rotatedFrom(server, stored);
      if (!rotated) {
        return {
          next: { ...host, user: undefined },
          result: 'gone' as const,
        };
      }

      current = rotated;
      return { next: { ...host, user: rotated }, result: 'refreshed' as const };
    });
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
      const host = (await getHostCredentials(apiUrl)) ?? {};
      const stored = usableSession(host, apiUrl);
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
