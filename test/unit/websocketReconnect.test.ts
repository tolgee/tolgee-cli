import {
  SessionExpiredError,
  type OAuthSessionHandle,
} from '#cli/oauth/session.js';

const configured: any[] = [];
const connectCalls: any[] = [];

vi.mock('@stomp/stompjs', () => ({
  Stomp: {
    over: () => ({
      configure: (config: any) => configured.push(config),
      connect: (...args: any[]) => connectCalls.push(args),
      connectHeaders: {},
      subscribe: () => ({ id: '1', unsubscribe: () => {} }),
      disconnect: () => {},
    }),
  },
  CompatClient: class {},
}));

vi.mock('sockjs-client', () => ({ default: class {} }));

const logged: string[] = [];

vi.mock('#cli/utils/logger.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#cli/utils/logger.js')>()),
  debug: (message: string) => logged.push(String(message)),
}));

type WebsocketModule = typeof import('#cli/client/WebsocketClient.js');
let WebsocketClient: WebsocketModule['WebsocketClient'];
let redactCredentials: WebsocketModule['redactCredentials'];

beforeAll(async () => {
  ({ WebsocketClient, redactCredentials } = await import(
    '#cli/client/WebsocketClient.js'
  ));
});

function sessionWith(
  token: string,
  afterRefresh = token,
  overrides: Partial<OAuthSessionHandle> = {}
): OAuthSessionHandle & { refreshes: number } {
  let current = token;
  return {
    refreshes: 0,
    getAccessToken: () => current,
    getUserName: () => undefined,
    async ensureFresh() {
      (this as any).refreshes += 1;
      current = afterRefresh;
    },
    refreshAfterUnauthorized: async () => false,
    ...overrides,
  };
}

beforeEach(() => {
  configured.length = 0;
  connectCalls.length = 0;
});

/** Builds a client and runs one connect attempt through it, the way stompjs does. */
async function oneConnectAttempt(options: any) {
  const client = WebsocketClient({ serverUrl: 'http://localhost', ...options });
  client.connectIfNotAlready();
  const stomp: any = { connectHeaders: {} };
  await configured[0].beforeConnect(stomp);
  return stomp;
}

describe('websocket reconnect', () => {
  it('refreshes and re-reads the token before every connect attempt', async () => {
    const session = sessionWith('tgoat_first', 'tgoat_second');
    const client = WebsocketClient({
      serverUrl: 'http://localhost',
      authentication: { session },
    });

    client.connectIfNotAlready();

    const { beforeConnect } = configured[0];
    const stomp: any = { connectHeaders: {} };

    await beforeConnect(stomp);
    expect(session.refreshes).toBe(1);
    expect(stomp.connectHeaders).toEqual({
      authorization: 'Bearer tgoat_second',
    });
    expect(client.connectedWith()).toBe('tgoat_second');

    await beforeConnect(stomp);
    expect(session.refreshes).toBe(2);
  });

  it('connects anyway when the refresh fails for a transient reason', async () => {
    const stomp = await oneConnectAttempt({
      authentication: {
        session: sessionWith('tgoat_first', undefined, {
          ensureFresh: async () => {
            throw new Error('connect ECONNREFUSED');
          },
        }),
      },
    });

    expect(stomp.connectHeaders).toEqual({
      authorization: 'Bearer tgoat_first',
    });
  });

  it('hands a dead session to the caller rather than reconnecting forever', async () => {
    const expired: Error[] = [];
    await oneConnectAttempt({
      authentication: {
        session: sessionWith('tgoat_first', undefined, {
          ensureFresh: async () => {
            throw new SessionExpiredError();
          },
        }),
      },
      onCredentialExpired: (e: Error) => expired.push(e),
    });

    expect(expired).toHaveLength(1);
    expect(expired[0].message).toMatch(/session has expired/i);
  });

  it('leaves an api key connection alone', async () => {
    const stomp = await oneConnectAttempt({
      authentication: { apiKey: 'tgpak_test' },
    });

    expect(stomp.connectHeaders).toEqual({ 'x-api-key': 'tgpak_test' });
  });
});

describe('websocket debug output', () => {
  it('redacts the frames stompjs hands it', () => {
    logged.length = 0;
    WebsocketClient({
      serverUrl: 'http://localhost',
      authentication: { session: sessionWith('tgoat_secret') },
    }).connectIfNotAlready();

    configured[0].debug(
      '>>> CONNECT\nauthorization:Bearer tgoat_secret\njwtToken:jwt_secret'
    );

    expect(logged.join('\n')).not.toContain('tgoat_secret');
    expect(logged.join('\n')).not.toContain('jwt_secret');
  });

  it('blanks the credential header lines in a frame', () => {
    const frame = [
      '>>> CONNECT',
      'authorization:Bearer tgoat_secret',
      'x-api-key:tgpak_secret',
      'accept-version:1.2',
    ].join('\n');

    expect(redactCredentials(frame)).toBe(
      [
        '>>> CONNECT',
        'authorization:<redacted>',
        'x-api-key:<redacted>',
        'accept-version:1.2',
      ].join('\n')
    );
  });
});
