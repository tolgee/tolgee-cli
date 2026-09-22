import {
  isOAuthSession,
  issuedBy,
  loadStore,
  storedSessionFor,
  type OAuthSession,
} from '../config/credentials.js';
import { debug, info, warn } from '../utils/logger.js';
import { tryParseUrl } from '../utils/url.js';
import { fetchAuthServerMetadata, revokeToken } from './authServer.js';
import { CLI_CLIENT_ID } from './constants.js';

/**
 * The headers one instance was configured with: its .tolgeerc and
 * --extra-header values, usually gateway credentials that no other instance
 * may see.
 */
export type ConfiguredHeaders = {
  instance: URL;
  headers: Record<string, string>;
};

export async function revokeSessionFor(
  apiUrl: URL,
  extraHeaders?: Record<string, string>
) {
  const session = await storedSessionFor(apiUrl);
  if (session) {
    await revokeReplacedSession(session, apiUrl, extraHeaders);
  }
}

/** Ends a session that is no longer stored for `apiUrl`. */
export async function revokeReplacedSession(
  session: OAuthSession,
  apiUrl: URL,
  extraHeaders?: Record<string, string>
) {
  if (issuedBy(session, apiUrl)) {
    await revokeAtIssuingInstance(session, extraHeaders);
    return;
  }

  info(
    `The stored session for ${apiUrl.hostname} was issued by ${session.apiUrl}; ending it there.`
  );
  await revokeAtIssuingInstance(session);
}

export async function revokeAllSessions(configured?: ConfiguredHeaders) {
  const store = await loadStore();
  const sessions = Object.values(store)
    .map((host) => host.user)
    .filter((user) => user !== undefined && isOAuthSession(user));

  await Promise.all(
    sessions.map((session) =>
      revokeAtIssuingInstance(
        session,
        configured && issuedBy(session, configured.instance)
          ? configured.headers
          : undefined
      )
    )
  );
}

async function revokeAtIssuingInstance(
  session: OAuthSession,
  extraHeaders?: Record<string, string>
) {
  const issuer = tryParseUrl(session.apiUrl);
  if (!issuer) {
    warn(
      `Could not end the session issued by ${session.apiUrl}: it is not a usable URL. It expires on its own.`
    );
    return;
  }

  try {
    const metadata = await fetchAuthServerMetadata(issuer, extraHeaders);
    // Revoking either token drops the whole grant.
    await revokeToken(
      metadata,
      { clientId: CLI_CLIENT_ID, token: session.refreshToken },
      extraHeaders
    );
    debug(`[OAUTH] Revoked the session on ${issuer.hostname}`);
  } catch (e: any) {
    // Logging out has to clear the machine even when the instance is down.
    warn(`Could not end the session on ${issuer.hostname}: ${e.message}`);
  }
}
