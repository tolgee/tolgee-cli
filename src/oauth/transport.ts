import { OAUTH_REQUEST_TIMEOUT_MS, USER_AGENT } from '../constants.js';
import { OAuthError } from './oauthError.js';

export type ExtraHeaders = Record<string, string>;

export async function getJson(
  url: URL,
  extraHeaders: ExtraHeaders | undefined,
  unreachable: string
): Promise<Response> {
  try {
    return await fetch(url, {
      headers: headers(extraHeaders),
      signal: AbortSignal.timeout(OAUTH_REQUEST_TIMEOUT_MS),
    });
  } catch (e: any) {
    throw new OAuthError(`${unreachable}: ${e.message}`, 'network');
  }
}

/**
 * OAuth 2.1 §3.2.2: the server rejects a token request carrying any query
 * string, so the URL is passed untouched.
 */
export async function postForm(
  endpoint: string,
  params: Record<string, string>,
  extraHeaders?: ExtraHeaders
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

export async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function headers(extra?: ExtraHeaders) {
  return {
    ...extra,
    'user-agent': USER_AGENT,
    accept: 'application/json',
  };
}
