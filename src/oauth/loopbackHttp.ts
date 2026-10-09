import { createServer, type Server, type ServerResponse } from 'http';
import { AddressInfo } from 'net';

/**
 * RFC 8252 §7.3 and §8.3: the IP literal rather than `localhost`, whose
 * resolution can put the listener on an interface other than the loopback one.
 * The server accepts a loopback redirect on any port, so the OS picks it.
 */
export const LOOPBACK_HOST = '127.0.0.1';

export async function listenOnLoopback(): Promise<Server> {
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

export function portOf(server: Server) {
  return (server.address() as AddressInfo).port;
}

export async function closeWithConnections(server: Server) {
  // Keep-alive sockets from the browser outlive close() on their own, and the
  // process would hang with them.
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

/** Node's parser passes on targets such as `//[` that `URL` refuses. */
export function requestUrl(
  target: string | undefined,
  base: string
): URL | undefined {
  try {
    return new URL(target ?? '/', base);
  } catch {
    return undefined;
  }
}

export function respondHtml(
  response: ServerResponse,
  status: number,
  body: string
) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    // The URL this renders carries the authorization code in its query string.
    'cache-control': 'no-store',
  });
  response.end(body);
}
