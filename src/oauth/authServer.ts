import { OAUTH_REQUEST_TIMEOUT_MS, USER_AGENT } from '../constants.js';
import { tryParseUrl } from '../utils/url.js';

export type AuthServerMetadata = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  scopesSupported?: string[];
};

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpires: number;
  scopes: string[];
  /**
   * The project the authorization was bound to, when it was bound to exactly
   * one.
   */
  projectId?: number;
};

/**
 * Short enough that a token which turns out to be dead is found out quickly, by
 * the 401 replay.
 */
const ASSUMED_LIFETIME_MS = 5 * 60 * 1000;

export type OAuthErrorKind = 'unsupported' | 'no-browser' | 'oauth' | 'network';

export class OAuthError extends Error {
  constructor(
    message: string,
    readonly kind: OAuthErrorKind
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

export async function fetchAuthServerMetadata(
  apiUrl: URL,
  extraHeaders?: Record<string, string>
): Promise<AuthServerMetadata> {
  const url = new URL('/.well-known/oauth-authorization-server', apiUrl);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: headers(extraHeaders),
      signal: AbortSignal.timeout(OAUTH_REQUEST_TIMEOUT_MS),
    });
  } catch (e: any) {
    throw new OAuthError(
      `Could not reach ${apiUrl.hostname}: ${e.message}`,
      'network'
    );
  }

  if (response.status === 404) {
    throw new OAuthError(
      `${apiUrl.hostname} does not offer browser login.`,
      'unsupported'
    );
  }
  if (!response.ok) {
    throw new OAuthError(
      `${apiUrl.hostname} answered ${response.status} to the authorization server lookup.`,
      'network'
    );
  }

  const body = await readJson(response);
  if (!body?.authorization_endpoint || !body?.token_endpoint) {
    throw new OAuthError(
      `${apiUrl.hostname} published an authorization server document without the endpoints browser login needs.`,
      'unsupported'
    );
  }

  return validated(apiUrl, {
    issuer: body.issuer,
    authorizationEndpoint: body.authorization_endpoint,
    tokenEndpoint: body.token_endpoint,
    revocationEndpoint: body.revocation_endpoint,
    scopesSupported: Array.isArray(body.scopes_supported)
      ? body.scopes_supported.filter((s: unknown) => typeof s === 'string')
      : undefined,
  });
}

export async function exchangeCode(
  metadata: AuthServerMetadata,
  params: {
    clientId: string;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  },
  extraHeaders?: Record<string, string>
): Promise<OAuthTokens> {
  const response = await postForm(
    metadata.tokenEndpoint,
    {
      grant_type: 'authorization_code',
      client_id: params.clientId,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    },
    extraHeaders
  );

  return readTokens(response);
}

export async function refreshTokens(
  metadata: AuthServerMetadata,
  params: { clientId: string; refreshToken: string },
  extraHeaders?: Record<string, string>
): Promise<OAuthTokens> {
  const response = await postForm(
    metadata.tokenEndpoint,
    {
      grant_type: 'refresh_token',
      client_id: params.clientId,
      refresh_token: params.refreshToken,
    },
    extraHeaders
  );

  return readTokens(response);
}

/**
 * RFC 7009 §2.2: a server that does not know the token still answers 200, so
 * only a transport failure is reported.
 */
export async function revokeToken(
  metadata: AuthServerMetadata,
  params: { clientId: string; token: string },
  extraHeaders?: Record<string, string>
): Promise<void> {
  if (!metadata.revocationEndpoint) {
    return;
  }

  const response = await postForm(
    metadata.revocationEndpoint,
    {
      client_id: params.clientId,
      token: params.token,
    },
    extraHeaders
  );

  if (!response.ok) {
    const body = await readJson(response);
    throwOAuthError(body, 'The authorization server refused to revoke.');
  }
}

function headers(extra?: Record<string, string>) {
  return {
    ...extra,
    'user-agent': USER_AGENT,
    accept: 'application/json',
  };
}

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * OAuth 2.1 §3.2.2: the server rejects a token request carrying any query
 * string, so the URL is passed untouched.
 */
async function postForm(
  endpoint: string,
  params: Record<string, string>,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers(extraHeaders),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(OAUTH_REQUEST_TIMEOUT_MS),
    });
  } catch (e: any) {
    throw new OAuthError(
      `Could not reach the authorization server: ${e.message}`,
      'network'
    );
  }
}

function throwOAuthError(body: any, fallback: string): never {
  const code = typeof body?.error === 'string' ? body.error : undefined;
  const description =
    typeof body?.error_description === 'string'
      ? body.error_description
      : undefined;

  throw new OAuthError(description ?? code ?? fallback, 'oauth');
}

async function readTokens(response: Response): Promise<OAuthTokens> {
  const body = await readJson(response);

  if (!response.ok) {
    // RFC 6749 §5.2: only a refusal stated in that form says anything about the
    // grant.
    if (
      typeof body?.error !== 'string' ||
      response.status >= 500 ||
      response.status === 429
    ) {
      throw new OAuthError(
        `The authorization server answered ${response.status}.`,
        'network'
      );
    }
    throwOAuthError(body, `The authorization server refused the request.`);
  }

  if (!body?.access_token || !body?.refresh_token) {
    throw new OAuthError(
      'The authorization server did not return a usable token.',
      'network'
    );
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    accessExpires: Date.now() + lifetimeMs(body.expires_in),
    scopes:
      typeof body.scope === 'string' && body.scope !== ''
        ? body.scope.split(' ')
        : [],
    projectId: boundProject(body.project_id),
  };
}

/**
 * An instance older than the field, or one whose consent covered every project,
 * sends nothing usable here.
 */
function boundProject(value: unknown) {
  const projectId = Number(value);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    return undefined;
  }
  return projectId;
}

/**
 * `expires_in` is only RECOMMENDED by RFC 6749 §5.1, and without it a token
 * reads as already expired.
 */
function lifetimeMs(expiresIn: unknown) {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return ASSUMED_LIFETIME_MS;
  }
  return seconds * 1000;
}

/**
 * RFC 8414 §3.3: without this the document decides where the CLI sends the code
 * and the credentials it exchanges it for, and the `iss` check on the callback
 * compares a value against itself.
 */
function validated(
  apiUrl: URL,
  metadata: AuthServerMetadata
): AuthServerMetadata {
  const refuse = (reason: string) => {
    throw new OAuthError(
      `${apiUrl.hostname} published an authorization server document that ${reason}.`,
      'unsupported'
    );
  };

  if (!metadata.issuer) {
    refuse('names no issuer');
  }
  if (tryParseUrl(metadata.issuer)?.origin !== apiUrl.origin) {
    refuse(`names ${metadata.issuer} as its issuer`);
  }
  for (const endpoint of [
    metadata.authorizationEndpoint,
    metadata.tokenEndpoint,
    metadata.revocationEndpoint,
  ]) {
    if (endpoint && tryParseUrl(endpoint)?.origin !== apiUrl.origin) {
      refuse(`points at ${endpoint}`);
    }
  }

  return metadata;
}
