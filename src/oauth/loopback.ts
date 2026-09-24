import { createServer, type Server, type ServerResponse } from 'http';
import { AddressInfo } from 'net';

import { OAuthError } from './authServer.js';
import { LOGGED_IN_PAGE, LOGIN_FAILED_PAGE } from './loopbackPages.js';

/**
 * RFC 8252 §7.3 and §8.3: the IP literal rather than `localhost`, whose
 * resolution can put the listener on an interface other than the loopback one.
 * The server accepts a loopback redirect on any port, so the OS picks it.
 */
const LOOPBACK_HOST = '127.0.0.1';
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
  const server = await listening();
  const { port } = server.address() as AddressInfo;
  const redirectUri = `http://${LOOPBACK_HOST}:${port}${CALLBACK_PATH}`;

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
            respond(response, 404, 'Not found');
            return;
          }

          const outcome = read(requestUrl(request.url, redirectUri), expected);
          if (outcome.kind === 'ignore') {
            respond(response, 404, 'Not found');
            return;
          }

          settled = true;
          clearTimeout(timer);

          if (outcome.kind === 'code') {
            respond(response, 200, LOGGED_IN_PAGE);
            resolve(outcome.code);
            return;
          }

          respond(response, 400, LOGIN_FAILED_PAGE);
          reject(outcome.error);
        });
      });
    },

    async close() {
      // Keep-alive sockets from the browser outlive close() on their own, and
      // the process would hang with them.
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function listening(): Promise<Server> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, LOOPBACK_HOST, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  return server;
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

type Outcome =
  | { kind: 'ignore' }
  | { kind: 'code'; code: string }
  | { kind: 'error'; error: OAuthError };

/**
 * Anything on this machine can reach the port, so a request that cannot be tied
 * to this authorization is ignored rather than failed: ending the login on one
 * would let a stray request cancel the callback still on its way.
 */
function read(url: URL | undefined, expected: Expected): Outcome {
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

/** Node's parser passes on targets such as `//[` that `URL` refuses. */
function requestUrl(target: string | undefined, base: string): URL | undefined {
  try {
    return new URL(target ?? '/', base);
  } catch {
    return undefined;
  }
}

function respond(response: ServerResponse, status: number, body: string) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    // The URL this renders carries the authorization code in its query string.
    'cache-control': 'no-store',
  });
  response.end(body);
}
