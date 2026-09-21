import type { AuthServerMetadata } from './authServer.js';

export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
  /**
   * Pre-selects a project on the consent screen; the user can still choose
   * another one.
   */
  project?: string;
};

export function buildAuthorizeUrl(
  metadata: AuthServerMetadata,
  params: AuthorizeParams
): string {
  const url = new URL(metadata.authorizationEndpoint);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  if (params.project) {
    url.searchParams.set('project', params.project);
  }

  return url.toString();
}
