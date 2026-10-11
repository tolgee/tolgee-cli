import { API_URL, userLogin } from './common.js';

/**
 * The `/oauth2/*` endpoints are hidden from the public OpenAPI document, so
 * they are not in the generated schema and the typed client cannot address
 * them.
 */
async function postJson(path: string, token: string, body: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `${path} answered ${response.status}: ${await response.text()}`
    );
  }

  return response.json() as any;
}

function authorizeBody(params: URLSearchParams) {
  return {
    clientId: params.get('client_id'),
    redirectUri: params.get('redirect_uri'),
    responseType: params.get('response_type'),
    scope: params.get('scope') ?? '',
    state: params.get('state'),
    codeChallenge: params.get('code_challenge'),
    codeChallengeMethod: params.get('code_challenge_method'),
  };
}

/**
 * Stands in for the user's browser, which is a page over these three calls.
 * Without a project the approval covers every project the user can reach.
 */
export async function approveAuthorization(
  authorizeUrl: string,
  projectId?: number
) {
  const token = await userLogin();
  const params = new URL(authorizeUrl).searchParams;
  const scope = params.get('scope') ?? '';

  const { consentState, redirectUrl } = await postJson(
    '/v2/oauth2/authorize',
    token,
    { ...authorizeBody(params), project: params.get('project') }
  );

  if (!consentState) {
    throw new Error(`The authorization was refused: ${redirectUrl}`);
  }

  const consent = await postJson('/v2/oauth2/consent', token, {
    state: consentState,
    scopes: scope.split(' ').filter(Boolean),
    ...(projectId === undefined
      ? { projectScope: 'ALL_PROJECTS' }
      : { projectScope: 'SINGLE_PROJECT', projectId }),
  });

  const landed = await fetch(consent.redirectUrl);
  if (!landed.ok) {
    throw new Error(`The CLI refused the callback: ${landed.status}`);
  }
}

export async function denyAuthorization(authorizeUrl: string) {
  const token = await userLogin();
  const params = new URL(authorizeUrl).searchParams;

  const { consentState } = await postJson(
    '/v2/oauth2/authorize',
    token,
    authorizeBody(params)
  );

  const consent = await postJson('/v2/oauth2/consent', token, {
    state: consentState,
    scopes: [],
  });

  await fetch(consent.redirectUrl);
}

export async function isTokenLive(accessToken: string) {
  const response = await fetch(`${API_URL}/v2/user`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  return response.status === 200;
}
