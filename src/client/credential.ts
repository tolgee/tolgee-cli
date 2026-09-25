import type { OAuthSessionHandle } from '../oauth/session.js';
import { debug } from '../utils/logger.js';

export type Credential = {
  apiKey?: string;
  session?: OAuthSessionHandle;
};

export function credentialHeaders(credential: Credential): {
  headers: Record<string, string>;
  accessToken?: string;
} {
  const accessToken = credential.session?.getAccessToken();
  if (accessToken) {
    return {
      headers: { authorization: `Bearer ${accessToken}` },
      accessToken,
    };
  }

  if (credential.apiKey) {
    return { headers: { 'x-api-key': credential.apiKey } };
  }

  return { headers: {} };
}

export function authenticatingFetch(credential: Credential) {
  const { session } = credential;

  function withCredential(request: Request) {
    const { headers, accessToken } = credentialHeaders(credential);
    if (!Object.keys(headers).length) {
      return { request, token: undefined };
    }
    const carrying = new Request(request);
    for (const [name, value] of Object.entries(headers)) {
      carrying.headers.set(name, value);
    }
    return { request: carrying, token: accessToken };
  }

  return async function fetchWithCredential(
    request: Request
  ): Promise<Response> {
    if (!session) {
      return fetch(withCredential(request).request);
    }

    // Cloned before the body is spent, and only where a replay is possible:
    // cloning tees the body, and a `push` carries every translation file.
    const forReplay = request.clone();
    const attempt = withCredential(request);
    const response = await fetch(attempt.request);

    if (response.status !== 401 || !attempt.token) {
      return response;
    }
    await session.refreshAfterUnauthorized(attempt.token);

    debug('[HTTP] Retrying with a refreshed access token');
    return fetch(withCredential(forReplay).request);
  };
}
