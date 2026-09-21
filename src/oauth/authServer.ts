import { USER_AGENT } from '../constants.js';

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
  /** Epoch milliseconds, like the `expires` the credential store already holds for api keys. */
  accessExpires: number;
  scopes: string[];
};

export type OAuthErrorKind =
  /** The instance does not run an authorization server, or is too old to have one. */
  | 'unsupported'
  /** The server answered with an RFC 6749 §5.2 error. */
  | 'oauth'
  | 'network';

export class OAuthError extends Error {
  constructor(
    message: string,
    readonly kind: OAuthErrorKind,
    readonly code?: string
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

function headers() {
  return {
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

export async function fetchAuthServerMetadata(
  apiUrl: URL
): Promise<AuthServerMetadata> {
  const url = new URL('/.well-known/oauth-authorization-server', apiUrl);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: headers(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  return {
    issuer: body.issuer,
    authorizationEndpoint: body.authorization_endpoint,
    tokenEndpoint: body.token_endpoint,
    revocationEndpoint: body.revocation_endpoint,
    scopesSupported: body.scopes_supported,
  };
}

/**
 * OAuth 2.1 §3.2.2: these parameters belong in the entity body. The server rejects a token request that carries any
 * query string at all, so the endpoint URL must be passed through untouched.
 */
async function postForm(
  endpoint: string,
  params: Record<string, string>
): Promise<Response> {
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers(),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  throw new OAuthError(description ?? code ?? fallback, 'oauth', code);
}

async function readTokens(response: Response): Promise<OAuthTokens> {
  const body = await readJson(response);

  if (!response.ok) {
    throwOAuthError(body, `The authorization server refused the request.`);
  }

  if (!body?.access_token || !body?.refresh_token) {
    throw new OAuthError(
      'The authorization server did not return a usable token.',
      'oauth'
    );
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    accessExpires: Date.now() + Number(body.expires_in ?? 0) * 1000,
    scopes:
      typeof body.scope === 'string' && body.scope !== ''
        ? body.scope.split(' ')
        : [],
  };
}

export async function exchangeCode(
  metadata: AuthServerMetadata,
  params: {
    clientId: string;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }
): Promise<OAuthTokens> {
  const response = await postForm(metadata.tokenEndpoint, {
    grant_type: 'authorization_code',
    client_id: params.clientId,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  return readTokens(response);
}

export async function refreshTokens(
  metadata: AuthServerMetadata,
  params: { clientId: string; refreshToken: string }
): Promise<OAuthTokens> {
  const response = await postForm(metadata.tokenEndpoint, {
    grant_type: 'refresh_token',
    client_id: params.clientId,
    refresh_token: params.refreshToken,
  });

  return readTokens(response);
}

/** RFC 7009 §2.2: a server that does not know the token still answers 200, so only a transport failure is reported. */
export async function revokeToken(
  metadata: AuthServerMetadata,
  params: { clientId: string; token: string }
): Promise<void> {
  if (!metadata.revocationEndpoint) {
    return;
  }

  const response = await postForm(metadata.revocationEndpoint, {
    client_id: params.clientId,
    token: params.token,
  });

  if (!response.ok) {
    const body = await readJson(response);
    throwOAuthError(body, 'The authorization server refused to revoke.');
  }
}
