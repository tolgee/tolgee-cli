import {
  exchangeCode,
  fetchAuthServerMetadata,
  OAuthError,
  refreshTokens,
  revokeToken,
  type AuthServerMetadata,
} from '#cli/oauth/authServer.js';

const API_URL = new URL('https://app.tolgee.io');

const METADATA: AuthServerMetadata = {
  issuer: 'https://app.tolgee.io',
  authorizationEndpoint: 'https://app.tolgee.io/oauth2/authorize',
  tokenEndpoint: 'https://app.tolgee.io/oauth2/token',
  revocationEndpoint: 'https://app.tolgee.io/oauth2/revoke',
};

const DISCOVERY_BODY = {
  issuer: 'https://app.tolgee.io',
  authorization_endpoint: 'https://app.tolgee.io/oauth2/authorize',
  token_endpoint: 'https://app.tolgee.io/oauth2/token',
  revocation_endpoint: 'https://app.tolgee.io/oauth2/revoke',
  scopes_supported: ['translations.view'],
};

const TOKEN_BODY = {
  access_token: 'tgoat_access',
  refresh_token: 'tgort_refresh',
  token_type: 'Bearer',
  expires_in: 1800,
  scope: 'translations.view keys.view',
};

type Call = { url: string; init?: RequestInit };

let calls: Call[];

function stubFetch(
  respond: (call: Call) => { status?: number; body?: unknown }
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL | string, init?: RequestInit) => {
      calls.push({ url: url.toString(), init });
      const { status = 200, body = {} } = respond({
        url: url.toString(),
        init,
      });
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}

function lastBody() {
  return new URLSearchParams(String(calls.at(-1)!.init!.body));
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('discovery', () => {
  it('reads the endpoints from the well-known document', async () => {
    stubFetch(() => ({ body: DISCOVERY_BODY }));

    const metadata = await fetchAuthServerMetadata(API_URL);

    expect(calls[0].url).toBe(
      'https://app.tolgee.io/.well-known/oauth-authorization-server'
    );
    expect(metadata).toEqual({
      ...METADATA,
      scopesSupported: ['translations.view'],
    });
  });

  it('reports an instance without an authorization server as unsupported', async () => {
    stubFetch(() => ({ status: 404 }));

    await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
      kind: 'unsupported',
    });
  });

  it('reads a failing lookup as a blip, not as an instance without browser login', async () => {
    for (const status of [502, 503, 429]) {
      stubFetch(() => ({ status }));

      await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
        kind: 'network',
      });
    }
  });

  it('refuses a document that names no endpoints', async () => {
    stubFetch(() => ({ body: { issuer: 'https://app.tolgee.io' } }));

    await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
      kind: 'unsupported',
    });
  });

  it('reports an unreachable host as a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connect ECONNREFUSED');
      })
    );

    await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
      kind: 'network',
    });
  });
});

describe('discovery validation', () => {
  it('refuses a document that names no issuer', async () => {
    stubFetch(() => ({ body: { ...DISCOVERY_BODY, issuer: undefined } }));

    await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
      kind: 'unsupported',
    });
  });

  it('refuses a document that claims to be another issuer', async () => {
    stubFetch(() => ({
      body: { ...DISCOVERY_BODY, issuer: 'https://evil.example' },
    }));

    await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
      kind: 'unsupported',
    });
  });

  it.each(['authorization_endpoint', 'token_endpoint', 'revocation_endpoint'])(
    'refuses a %s somewhere else',
    async (field) => {
      stubFetch(() => ({
        body: { ...DISCOVERY_BODY, [field]: 'https://evil.example/x' },
      }));

      await expect(fetchAuthServerMetadata(API_URL)).rejects.toMatchObject({
        kind: 'unsupported',
      });
    }
  );

  it('carries the caller headers, which the CLI applies to every Tolgee request', async () => {
    stubFetch(() => ({ body: DISCOVERY_BODY }));

    await fetchAuthServerMetadata(API_URL, { 'x-proxy': 'yes' });

    expect((calls[0].init!.headers as any)['x-proxy']).toBe('yes');
  });
});

describe('token lifetime', () => {
  it('assumes a short life when the server reports none', async () => {
    stubFetch(() => ({ body: { ...TOKEN_BODY, expires_in: undefined } }));
    const before = Date.now();

    const tokens = await exchangeCode(METADATA, {
      clientId: 'tolgee-cli',
      code: 'the-code',
      redirectUri: 'http://127.0.0.1:1/callback',
      codeVerifier: 'v',
    });

    expect(tokens.accessExpires).toBeGreaterThan(before + 60_000);
  });
});

describe('a refused token request', () => {
  it('reads a transport-level refusal as a blip rather than a dead grant', async () => {
    stubFetch(() => ({ status: 503, body: { message: 'upstream down' } }));

    await expect(
      refreshTokens(METADATA, {
        clientId: 'tolgee-cli',
        refreshToken: 'tgort_x',
      })
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('still reads a stated refusal as one', async () => {
    stubFetch(() => ({ status: 400, body: { error: 'invalid_grant' } }));

    await expect(
      refreshTokens(METADATA, {
        clientId: 'tolgee-cli',
        refreshToken: 'tgort_x',
      })
    ).rejects.toMatchObject({ kind: 'oauth', message: 'invalid_grant' });
  });
});

describe('code exchange', () => {
  const PARAMS = {
    clientId: 'tolgee-cli',
    code: 'the-code',
    redirectUri: 'http://127.0.0.1:53211/callback',
    codeVerifier: 'the-verifier',
  };

  it('sends the grant in the body and nothing in the query string', async () => {
    stubFetch(() => ({ body: TOKEN_BODY }));

    await exchangeCode(METADATA, PARAMS);

    const call = calls.at(-1)!;
    expect(new URL(call.url).search).toBe('');
    expect(call.init!.method).toBe('POST');
    expect((call.init!.headers as any)['content-type']).toBe(
      'application/x-www-form-urlencoded'
    );

    const body = lastBody();
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('tolgee-cli');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('code_verifier')).toBe('the-verifier');
    expect(body.get('redirect_uri')).toBe('http://127.0.0.1:53211/callback');
  });

  it('returns the pair with an absolute expiry', async () => {
    stubFetch(() => ({ body: TOKEN_BODY }));
    const before = Date.now();

    const tokens = await exchangeCode(METADATA, PARAMS);

    expect(tokens.accessToken).toBe('tgoat_access');
    expect(tokens.refreshToken).toBe('tgort_refresh');
    expect(tokens.scopes).toEqual(['translations.view', 'keys.view']);
    expect(tokens.accessExpires).toBeGreaterThanOrEqual(before + 1800_000);
  });

  it('reports a stated refusal with the description the server gave', async () => {
    stubFetch(() => ({
      status: 400,
      body: { error: 'invalid_grant', error_description: 'code is expired' },
    }));

    await expect(exchangeCode(METADATA, PARAMS)).rejects.toMatchObject({
      kind: 'oauth',
      message: 'code is expired',
    });
  });

  it('refuses a 200 that carries no usable pair', async () => {
    stubFetch(() => ({ body: { access_token: 'tgoat_access' } }));

    await expect(exchangeCode(METADATA, PARAMS)).rejects.toBeInstanceOf(
      OAuthError
    );
  });
});

describe('refresh', () => {
  it('sends the refresh grant in the body', async () => {
    stubFetch(() => ({ body: TOKEN_BODY }));

    await refreshTokens(METADATA, {
      clientId: 'tolgee-cli',
      refreshToken: 'tgort_old',
    });

    const body = lastBody();
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('tgort_old');
    expect(new URL(calls.at(-1)!.url).search).toBe('');
  });
});

describe('revocation', () => {
  it('posts the token to the revocation endpoint', async () => {
    stubFetch(() => ({ body: {} }));

    await revokeToken(METADATA, {
      clientId: 'tolgee-cli',
      token: 'tgort_refresh',
    });

    expect(calls.at(-1)!.url).toBe('https://app.tolgee.io/oauth2/revoke');
    expect(lastBody().get('token')).toBe('tgort_refresh');
  });

  it('does nothing when the server publishes no revocation endpoint', async () => {
    stubFetch(() => ({ body: {} }));

    await revokeToken(
      { ...METADATA, revocationEndpoint: undefined },
      { clientId: 'tolgee-cli', token: 'tgort_refresh' }
    );

    expect(calls).toHaveLength(0);
  });
});
