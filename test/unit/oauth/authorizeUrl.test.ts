import { buildAuthorizeUrl } from '#cli/oauth/authorizeUrl.js';
import type { AuthServerMetadata } from '#cli/oauth/authServer.js';

const METADATA: AuthServerMetadata = {
  issuer: 'https://app.tolgee.io',
  authorizationEndpoint: 'https://app.tolgee.io/oauth2/authorize',
  tokenEndpoint: 'https://app.tolgee.io/oauth2/token',
};

const PARAMS = {
  clientId: 'tolgee-cli',
  redirectUri: 'http://127.0.0.1:53211/callback',
  scopes: ['translations.view', 'keys.view'],
  state: 'state-value',
  codeChallenge: 'challenge-value',
};

function paramsOf(url: string) {
  return new URL(url).searchParams;
}

describe('authorize URL', () => {
  it('carries everything the authorization code flow needs', () => {
    const params = paramsOf(buildAuthorizeUrl(METADATA, PARAMS));

    expect(params.get('response_type')).toBe('code');
    expect(params.get('client_id')).toBe('tolgee-cli');
    expect(params.get('redirect_uri')).toBe('http://127.0.0.1:53211/callback');
    expect(params.get('scope')).toBe('translations.view keys.view');
    expect(params.get('state')).toBe('state-value');
    expect(params.get('code_challenge')).toBe('challenge-value');
    expect(params.get('code_challenge_method')).toBe('S256');
  });

  it('pre-selects a project only when there is one', () => {
    expect(paramsOf(buildAuthorizeUrl(METADATA, PARAMS)).has('project')).toBe(
      false
    );
    expect(
      paramsOf(buildAuthorizeUrl(METADATA, { ...PARAMS, project: '12' })).get(
        'project'
      )
    ).toBe('12');
  });

  // The CLI talks to the REST API, whose tokens are api-audience. Naming a
  // resource would bind the token to a different resource server and every
  // request the CLI makes would then be refused as invalid_token.
  it('never asks for an audience', () => {
    expect(
      paramsOf(buildAuthorizeUrl(METADATA, { ...PARAMS, project: '12' })).has(
        'resource'
      )
    ).toBe(false);
  });

  it('keeps a path-carrying authorization endpoint intact', () => {
    const url = buildAuthorizeUrl(
      { ...METADATA, authorizationEndpoint: 'https://tolgee.example/x/auth' },
      PARAMS
    );

    expect(new URL(url).pathname).toBe('/x/auth');
  });
});
