import type { IncomingHttpHeaders } from 'http';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'http';
import type { AddressInfo } from 'net';

export async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function jsonWriter(response: ServerResponse) {
  return (status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  };
}

export async function listenOnLoopback(server: Server): Promise<string> {
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve())
  );
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

export async function closeServer(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

export type OAuthStub = {
  origin: string;
  revoked: URLSearchParams[];
  receivedHeaders: IncomingHttpHeaders[];
  close(): Promise<void>;
};

export async function startOAuthStub(
  revokeStatus: () => number = () => 200
): Promise<OAuthStub> {
  const revoked: URLSearchParams[] = [];
  const receivedHeaders: IncomingHttpHeaders[] = [];
  let origin = '';

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const json = jsonWriter(response);
    receivedHeaders.push(request.headers);

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      json(200, {
        issuer: origin,
        authorization_endpoint: `${origin}/oauth2/authorize`,
        token_endpoint: `${origin}/oauth2/token`,
        revocation_endpoint: `${origin}/oauth2/revoke`,
      });
      return;
    }

    if (url.pathname === '/oauth2/revoke') {
      revoked.push(new URLSearchParams(await readBody(request)));
      json(revokeStatus(), {});
      return;
    }

    json(404, {});
  });

  origin = await listenOnLoopback(server);
  return {
    origin,
    revoked,
    receivedHeaders,
    close: () => closeServer(server),
  };
}
