import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { createServer, type Server } from 'http';
import {
  closeServer,
  jsonWriter,
  listenOnLoopback,
  readBody,
} from './stubHttp.js';

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
let apiCalls: string[];
let refreshStatus: number;
let issued: number;
let gatewayHeaders: (string | undefined)[];

beforeAll(async () => {
  ({ createOAuthSessionHandle } = await import('#cli/oauth/session.js'));
  credentials = await import('#cli/config/credentials.js');
});

beforeEach(async () => {
  refreshRequests = [];
  apiCalls = [];
  refreshStatus = 200;
  issued = 0;
  gatewayHeaders = [];

  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const json = jsonWriter(response);
    gatewayHeaders.push(request.headers['x-gateway'] as string | undefined);

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      json(200, {
        issuer: apiUrl.origin,
        authorization_endpoint: `${apiUrl.origin}/oauth2/authorize`,
        token_endpoint: `${apiUrl.origin}/oauth2/token`,
      });
      return;
    }

    if (url.pathname === '/v2/projects') {
      apiCalls.push(request.headers.authorization as string);
      if (apiCalls.length === 1) {
        json(401, { error: 'invalid_token' });
        return;
      }
      json(200, { page: {} });
      return;
    }

    if (url.pathname === '/oauth2/token') {
      refreshRequests.push(new URLSearchParams(await readBody(request)));
      if (refreshStatus !== 200) {
        json(refreshStatus, { error: 'invalid_grant' });
        return;
      }
      issued += 1;
      // A slow rotation is what lets a second process reach the lock while this
      // one holds it.
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

  apiUrl = new URL(await listenOnLoopback(server));

  await credentials.clearAuthStore();
});

afterEach(async () => {
  await closeServer(server);
});

function session(overrides: Partial<any> = {}) {
  return {
    type: 'oauth' as const,
    accessToken: 'tgoat_stored',
    refreshToken: 'tgort_stored',
    accessExpires: Date.now() + 30 * 60 * 1000,
    scopes: ['translations.edit'],
    apiUrl: apiUrl.toString(),
    userName: 'Sleepy Cat',
    ...overrides,
  };
}

async function storedSession() {
  const stored = await credentials.getStoredCredentials(apiUrl, -1);
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

  it('carries the custom headers to the discovery and token requests', async () => {
    const initial = session({ accessExpires: Date.now() + 10_000 });
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial, {
      'x-gateway': 'secret',
    });

    await handle.ensureFresh();

    expect(refreshRequests).toHaveLength(1);
    expect(gatewayHeaders).toEqual(['secret', 'secret']);
  });
});

describe('a session another process stored', () => {
  it('is adopted without asking the server', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);
    await credentials.saveOAuthSession(
      apiUrl,
      session({ accessToken: 'tgoat_newer', refreshToken: 'tgort_newer' })
    );

    await expect(handle.adoptNewerSession()).resolves.toBe(true);

    expect(handle.getAccessToken()).toBe('tgoat_newer');
    expect(refreshRequests).toHaveLength(0);
  });

  it('is not there when the store still holds this one', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(handle.adoptNewerSession()).resolves.toBe(false);
    expect(handle.getAccessToken()).toBe('tgoat_stored');
  });

  it('is left alone when another instance issued it', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);
    await credentials.saveOAuthSession(
      apiUrl,
      session({ apiUrl: 'http://localhost:1/', accessToken: 'tgoat_elsewhere' })
    );

    await expect(handle.adoptNewerSession()).resolves.toBe(false);
    expect(handle.getAccessToken()).toBe('tgoat_stored');
  });
});

describe('a session replaced by another instance', () => {
  it('does not adopt a session issued by somewhere else', async () => {
    const initial = session({ accessExpires: Date.now() + 10_000 });
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await credentials.saveOAuthSession(
      apiUrl,
      session({
        apiUrl: 'http://localhost:1/',
        accessToken: 'tgoat_elsewhere',
        refreshToken: 'tgort_elsewhere',
      })
    );

    await expect(handle.ensureFresh()).rejects.toThrow(/session has expired/i);
    expect(handle.getAccessToken()).not.toBe('tgoat_elsewhere');
    expect(refreshRequests).toHaveLength(0);
  });
});

describe('session after a 401', () => {
  it('rotates and asks for the request to be sent again', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(handle.refreshAfterUnauthorized('tgoat_stored')).resolves.toBe(
      'refreshed'
    );
    expect(handle.getAccessToken()).toBe('tgoat_1');
  });

  it('does not refresh again when the token has already moved on', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(handle.refreshAfterUnauthorized('tgoat_older')).resolves.toBe(
      'adopted'
    );
    expect(refreshRequests).toHaveLength(0);
  });

  it('gives up when the server refuses the refresh token', async () => {
    refreshStatus = 400;
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    await credentials.saveApiKey(apiUrl, {
      type: 'PAK',
      key: 'tgpak_kept',
      username: 'tester',
      project: { id: 1, name: 'project 1' },
      expires: 0,
    });
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await expect(
      handle.refreshAfterUnauthorized('tgoat_stored')
    ).rejects.toThrow(/session has expired/i);

    expect(await storedSession()).toBeUndefined();
    expect(await credentials.getStoredCredentials(apiUrl, 1)).toEqual({
      type: 'apiKey',
      key: 'tgpak_kept',
    });
  });

  it('gives up when the session was removed while the command ran', async () => {
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);
    await credentials.removeApiKeys(apiUrl);

    await expect(
      handle.refreshAfterUnauthorized('tgoat_stored')
    ).rejects.toThrow(/session has expired/i);
  });
});

describe('a refused request and the session together', () => {
  it('rotates and sends the request again with the token that came back', async () => {
    const { createTolgeeClient } = await import('#cli/client/TolgeeClient.js');
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    const client = createTolgeeClient({
      baseUrl: apiUrl.toString(),
      session: handle,
    });
    const response = await (client as any).GET('/v2/projects');

    expect(response.error).toBeUndefined();
    expect(apiCalls).toEqual(['Bearer tgoat_stored', 'Bearer tgoat_1']);
    expect(refreshRequests).toHaveLength(1);
  });

  it('reports the dead session out of the request when the refresh is refused', async () => {
    const { createTolgeeClient } = await import('#cli/client/TolgeeClient.js');
    refreshStatus = 400;
    const initial = session();
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    const client = createTolgeeClient({
      baseUrl: apiUrl.toString(),
      session: handle,
    });

    await expect((client as any).GET('/v2/projects')).rejects.toThrow(
      /session has expired/i
    );
    expect(apiCalls).toEqual(['Bearer tgoat_stored']);
  });

  it('keeps the session when the refresh cannot reach the server', async () => {
    const initial = session({ accessExpires: Date.now() + 10_000 });
    await credentials.saveOAuthSession(apiUrl, initial);
    const handle = createOAuthSessionHandle(apiUrl, initial);

    await closeServer(server);

    await expect(handle.ensureFresh()).rejects.toMatchObject({
      kind: 'network',
    });
    expect(await storedSession()).toMatchObject({
      refreshToken: 'tgort_stored',
    });

    server = createServer();
    await listenOnLoopback(server);
  });
});
