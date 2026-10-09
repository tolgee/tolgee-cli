import {
  closeWithConnections,
  listenOnLoopback,
  LOOPBACK_HOST,
  portOf,
  requestUrl,
  respondHtml,
} from './loopbackHttp.js';
import { LOGGED_IN_PAGE, LOGIN_FAILED_PAGE } from './loopbackPages.js';
import { OAuthError } from './oauthError.js';

const CALLBACK_PATH = '/callback';

/**
 * The consent screen stays valid for 15 minutes, so there is nothing to wait
 * for past that.
 */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export type LoopbackServer = {
  redirectUri: string;
  waitForCode(expected: Expected): Promise<string>;
  close(): Promise<void>;
};

type Expected = { state: string; issuer?: string };

export async function startLoopbackServer(
  options: { timeoutMs?: number } = {}
): Promise<LoopbackServer> {
  const server = await listenOnLoopback();
  const redirectUri = `http://${LOOPBACK_HOST}:${portOf(server)}${CALLBACK_PATH}`;

  return {
    redirectUri,

    waitForCode(expected) {
      return new Promise<string>((resolve, reject) => {
        const timer = giveUpAfter(
          options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          reject
        );
        let settled = false;

        server.on('request', (request, response) => {
          if (settled) {
            respondHtml(response, 404, 'Not found');
            return;
          }

          const outcome = classifyCallback(
            requestUrl(request.url, redirectUri),
            expected
          );
          if (outcome.kind === 'ignore') {
            respondHtml(response, 404, 'Not found');
            return;
          }

          settled = true;
          clearTimeout(timer);

          if (outcome.kind === 'code') {
            respondHtml(response, 200, LOGGED_IN_PAGE);
            resolve(outcome.code);
            return;
          }

          respondHtml(response, 400, LOGIN_FAILED_PAGE);
          reject(outcome.error);
        });
      });
    },

    close: () => closeWithConnections(server),
  };
}

function giveUpAfter(ms: number, reject: (error: OAuthError) => void) {
  const timer = setTimeout(() => {
    reject(
      new OAuthError(
        'Timed out waiting for the browser to come back.',
        'network'
      )
    );
  }, ms);
  timer.unref?.();
  return timer;
}

type CallbackOutcome =
  | { kind: 'ignore' }
  | { kind: 'code'; code: string }
  | { kind: 'error'; error: OAuthError };

/**
 * Anything on this machine can reach the port, so a request that cannot be tied
 * to this authorization is ignored rather than failed: ending the login on one
 * would let a stray request cancel the callback still on its way.
 */
function classifyCallback(
  url: URL | undefined,
  expected: Expected
): CallbackOutcome {
  if (url === undefined || url.pathname !== CALLBACK_PATH) {
    return { kind: 'ignore' };
  }

  const query = url.searchParams;
  if (query.get('state') !== expected.state) {
    return { kind: 'ignore' };
  }

  // RFC 9207: an authorization response naming another issuer must not be
  // usable here.
  const issuer = query.get('iss');
  if (expected.issuer && issuer && issuer !== expected.issuer) {
    return {
      kind: 'error',
      error: new OAuthError(
        `The authorization came back from ${issuer}, not ${expected.issuer}.`,
        'oauth'
      ),
    };
  }

  const error = query.get('error');
  if (error) {
    return {
      kind: 'error',
      error: new OAuthError(query.get('error_description') ?? error, 'oauth'),
    };
  }

  const code = query.get('code');
  if (!code) {
    return {
      kind: 'error',
      error: new OAuthError(
        'The authorization server came back without a code.',
        'oauth'
      ),
    };
  }

  return { kind: 'code', code };
}
