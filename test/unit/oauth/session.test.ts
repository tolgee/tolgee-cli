import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { createServer, type Server } from 'http';
import { AddressInfo } from 'net';

type SessionModule = typeof import('#cli/oauth/session.js');
type CredentialsModule = typeof import('#cli/config/credentials.js');

const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'tolgee-cli-session-'));
process.env.TOLGEE_CLI_CONFIG_PATH = CONFIG_DIR;

vi.mock('#cli/utils/logger.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#cli/utils/logger.js')>()),
  // The real one ends the process, which would take the test runner with it.
  exitWithError: vi.fn((message: string | Error) => {
    throw new Error(String(message));
  }),
}));

let createOAuthSessionHandle: SessionModule['createOAuthSessionHandle'];
let credentials: CredentialsModule;

let server: Server;
let apiUrl: URL;
let refreshRequests: URLSearchParams[];
let refreshStatus: number;
let issued: number;

async function readBody(request: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

beforeAll(async () => {
  ({ createOAuthSessionHandle } = await import('#cli/oauth/session.js'));
  credentials = await import('#cli/config/credentials.js');
});

beforeEach(async () => {
  refreshRequests = [];
  refreshStatus = 200;
  issued = 0;

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
      });
      return;
    }

    if (url.pathname === '/oauth2/token') {
      refreshRequests.push(new URLSearchParams(await readBody(request)));
      if (refreshStatus !== 200) {
        json(refreshStatus, { error: 'invalid_grant' });
        return;
      }
      issued += 1;
      // A slow rotation is what lets a second process reach the lock while this one holds it.
      await new Promise((resolve) => setTimeout(resolve, 30));
      json(200, {
        access_token: `tgoat_${issued}`,
        refresh_token: `tgort_${issued}`,
        token_type: 'Bearer',
        expires_in: 1800,
        scope: 'translations.edit',
      });
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

function session(overrides: Partial<any> = {}) {
  return {
    type: 'oauth' as const,
    accessToken: 'tgoat_stored',
    refreshToken: 'tgort_stored',
    accessExpires: Date.now() + 30 * 60 * 1000,
    userName: 'Sleepy Cat',
    ...overrides,
  };
}

async function storedSession() {
  const stored = await credentials.getStoredCredentials(apiUrl.toString(), -1);
  return stored?.type === 'oauth' ? stored.session : undefined;
}

describe('session refresh', () => {
  it('leaves a token with time left alone', async () => {
    const handle = createOAuthSessionHandle(apiUrl, session());

    await handle.ensureFresh();

    expect(refreshRequests).toHaveLength(0);
    expect(handle.getAccessToken()).toBe('tgoat_stored');
  });

  it('rotates a token that is about to expire', async () => {
    const initial = session({ accessExpires: Date.now() + 10_000 });
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await handle.ensureFresh();

    expect(refreshRequests[0].get('grant_type')).toBe('refresh_token');
    expect(refreshRequests[0].get('refresh_token')).toBe('tgort_stored');
    expect(handle.getAccessToken()).toBe('tgoat_1');
    expect(await storedSession()).toMatchObject({
      accessToken: 'tgoat_1',
      refreshToken: 'tgort_1',
      userName: 'Sleepy Cat',
    });
  });

  // Two `tolgee` processes sharing one grant: the lock decides who rotates, and the loser has to carry on with the
  // winner's pair rather than replaying the refresh token the server has already retired.
  it('lets a second process use the pair the first one just rotated to', async () => {
    const initial = session({ accessExpires: Date.now() + 10_000 });
    await credentials.saveOAuthSession(apiUrl, initial);

    const first = createOAuthSessionHandle(apiUrl, initial);
    const second = createOAuthSessionHandle(apiUrl, initial);

    await Promise.all([first.ensureFresh(), second.ensureFresh()]);

    expect(refreshRequests).toHaveLength(1);
    expect(first.getAccessToken()).toBe('tgoat_1');
    expect(second.getAccessToken()).toBe('tgoat_1');
  });

  it('refreshes once for concurrent callers in one process', async () => {
    const initial = session({ accessExpires: Date.now() + 10_000 });
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await Promise.all([
      handle.ensureFresh(),
      handle.ensureFresh(),
      handle.ensureFresh(),
    ]);

    expect(refreshRequests).toHaveLength(1);
  });
});

describe('session after a 401', () => {
  it('rotates and asks for the request to be sent again', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(handle.refreshAfterUnauthorized('tgoat_stored')).resolves.toBe(
      true
    );
    expect(handle.getAccessToken()).toBe('tgoat_1');
  });

  it('does not refresh again when the token has already moved on', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(handle.refreshAfterUnauthorized('tgoat_older')).resolves.toBe(
      true
    );
    expect(refreshRequests).toHaveLength(0);
  });

  it('gives up when the server refuses the refresh token', async () => {
    refreshStatus = 400;
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    await credentials.savePak(
      apiUrl,
      { id: 1, name: 'project 1' },
      { token: 'tgpak_kept', expires: 0 }
    );
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(
      handle.refreshAfterUnauthorized('tgoat_stored')
    ).rejects.toThrow(/session has expired/i);

    expect(await storedSession()).toBeUndefined();
    // Only the browser session is gone; api keys for the same host are a separate credential.
    expect(await credentials.getApiKey(apiUrl.toString(), 1)).toBe(
      'tgpak_kept'
    );
  });

  it('gives up when the session was removed while the command ran', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);
    await credentials.clearUserCredentials(apiUrl);

    await expect(
      handle.refreshAfterUnauthorized('tgoat_stored')
    ).rejects.toThrow(/session has expired/i);
  });
});
