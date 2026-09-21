import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { createServer, type Server } from 'http';
import { AddressInfo } from 'net';

type RevokeModule = typeof import('#cli/oauth/revoke.js');
type CredentialsModule = typeof import('#cli/config/credentials.js');

const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'tolgee-cli-revoke-'));
process.env.TOLGEE_CLI_CONFIG_PATH = CONFIG_DIR;

let revoke: RevokeModule;
let credentials: CredentialsModule;

let server: Server;
let apiUrl: URL;
let revoked: URLSearchParams[];
let revokeStatus: number;

async function readBody(request: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

beforeAll(async () => {
  revoke = await import('#cli/oauth/revoke.js');
  credentials = await import('#cli/config/credentials.js');
});

beforeEach(async () => {
  revoked = [];
  revokeStatus = 200;

  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const json = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      json(200, {
        issuer: apiUrl.origin,
        authorization_endpoint: `${apiUrl.origin}/oauth2/authorize`,
        token_endpoint: `${apiUrl.origin}/oauth2/token`,
        revocation_endpoint: `${apiUrl.origin}/oauth2/revoke`,
      });
      return;
    }

    if (url.pathname === '/oauth2/revoke') {
      revoked.push(new URLSearchParams(await readBody(request)));
      json(revokeStatus, {});
      return;
    }

    json(404, {});
  });

  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve())
  );
  apiUrl = new URL(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  );

  await credentials.clearAuthStore();
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function session() {
  return {
    type: 'oauth' as const,
    accessToken: 'tgoat_access',
    refreshToken: 'tgort_refresh',
    accessExpires: Date.now() + 60_000,
    apiUrl: apiUrl.toString(),
  };
}

describe('revoking on logout', () => {
  it('ends the grant with the refresh token', async () => {
    await credentials.saveOAuthSession(apiUrl, session());

    await revoke.revokeSessionFor(apiUrl);

    expect(revoked).toHaveLength(1);
    expect(revoked[0].get('token')).toBe('tgort_refresh');
    expect(revoked[0].get('client_id')).toBe('tolgee-cli');
  });

  it('says nothing to the server about an api key', async () => {
    await credentials.savePat(apiUrl, { token: 'tgpat_x', expires: 0 });

    await revoke.revokeSessionFor(apiUrl);

    expect(revoked).toHaveLength(0);
  });

  // Logging out has to clear the machine even when the instance is down.
  it('does not fail when the server refuses', async () => {
    revokeStatus = 400;
    await credentials.saveOAuthSession(apiUrl, session());

    await expect(revoke.revokeSessionFor(apiUrl)).resolves.toBeUndefined();
  });

  it('does not fail when the instance is unreachable', async () => {
    await credentials.saveOAuthSession(apiUrl, session());
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await expect(revoke.revokeSessionFor(apiUrl)).resolves.toBeUndefined();

    server = createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', () => resolve())
    );
  });

  it('ends every session it knows how to address', async () => {
    await credentials.saveOAuthSession(apiUrl, session());
    // Written before the instance URL was recorded: the hostname alone cannot address a token endpoint.
    await credentials.saveOAuthSession(new URL('https://other.local'), {
      ...session(),
      apiUrl: undefined,
      refreshToken: 'tgort_other',
    });

    await revoke.revokeAllSessions();

    expect(revoked.map((body) => body.get('token'))).toEqual(['tgort_refresh']);
  });
});
