import {
  SessionExpiredError,
  type RefreshOutcome,
} from '#cli/oauth/session.js';

let websocketOptions: any;
let onTheWire: string | undefined;

const REFUSED = { headers: { message: 'Unauthenticated' } };
let exitCodes: number[];
let errors: string[];

vi.mock('#cli/client/WebsocketClient.js', () => ({
  WebsocketClient: (options: any) => {
    websocketOptions = options;
    return {
      subscribe: () => () => {},
      deactivate: () => {},
      connectIfNotAlready: () => {},
      lastConnectToken: () => onTheWire,
    };
  },
}));

vi.mock('#cli/utils/logger.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#cli/utils/logger.js')>()),
  info: () => {},
  success: () => {},
  debug: () => {},
  error: (message: string) => errors.push(String(message)),
}));

type Module = typeof import('#cli/utils/pullWatch/watchHandler.js');
let startWatching: Module['startWatching'];

beforeAll(async () => {
  ({ startWatching } = await import('#cli/utils/pullWatch/watchHandler.js'));
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exitCodes.push(code ?? 0);
    // The real one never returns, and the code after it assumes as much.
    throw new Error(`exit ${code}`);
  }) as any);
});

afterEach(() => {
  if (vi.isMockFunction(Date.now)) {
    vi.mocked(Date.now).mockRestore();
  }
});

beforeEach(() => {
  websocketOptions = undefined;
  onTheWire = 'tgoat_on_the_wire';
  exitCodes = [];
  errors = [];
});

function watch(
  overrides: Partial<Parameters<Module['startWatching']>[0]> = {}
) {
  const client = {
    GET: vi.fn().mockResolvedValue({
      response: { headers: new Headers({ 'x-tolgee-version': '3.200.0' }) },
    }),
  } as any;

  // startWatching never resolves: it ends by awaiting a promise nothing
  // settles.
  void startWatching({
    apiUrl: new URL('http://localhost:8080'),
    projectId: 1,
    client,
    doPull: async () => {},
    ...overrides,
  });
  return waitFor(() => websocketOptions !== undefined);
}

async function waitFor(ready: () => boolean) {
  for (let i = 0; i < 100 && !ready(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function sessionThatIsGone(): any {
  return {
    getAccessToken: () => 'tgoat_dead',
    getProjectId: () => undefined,
    ensureFresh: async () => {
      throw new SessionExpiredError();
    },
    refreshAfterUnauthorized: async () => {
      throw new SessionExpiredError();
    },
    adoptNewerSession: async () => false,
  };
}

async function watchRecordingRenewals(
  answer: () => Promise<RefreshOutcome> = async () => 'refreshed'
) {
  const asked: string[] = [];
  await watch({
    session: liveSession({
      refreshAfterUnauthorized: async (used: string) => {
        asked.push(used);
        return answer();
      },
    }),
  });
  return asked;
}

function liveSession(overrides: Record<string, unknown> = {}): any {
  return {
    getAccessToken: () => onTheWire,
    getProjectId: () => undefined,
    ensureFresh: async () => {},
    refreshAfterUnauthorized: async () => 'refreshed',
    adoptNewerSession: async () => false,
    ...overrides,
  };
}

describe('a watch whose credential dies', () => {
  it('stops with the reason when the websocket reports it', async () => {
    await watch({ session: sessionThatIsGone() });

    expect(() =>
      websocketOptions.onCredentialExpired(new SessionExpiredError())
    ).toThrow(/exit 1/);
    expect(errors.join('\n')).toMatch(/session has expired/i);
    expect(exitCodes).toEqual([1]);
  });

  it('stops when the pull itself reports it, rather than retrying forever', async () => {
    await watch({
      session: sessionThatIsGone(),
      doPull: async () => {
        throw new SessionExpiredError();
      },
    });

    websocketOptions.onConnected?.({});
    await waitFor(() => exitCodes.length > 0);

    expect(errors.join('\n')).toMatch(/session has expired/i);
    expect(exitCodes).toEqual([1]);
  });

  it('gives up when a renewal does not stop the refusals', async () => {
    await watch({ session: liveSession() });

    await websocketOptions.onError(REFUSED);
    expect(exitCodes).toEqual([]);

    // Neither of these may count as progress.
    websocketOptions.onConnected?.({});
    onTheWire = 'tgoat_rotated';
    await websocketOptions.onError(REFUSED);
    await waitFor(() => exitCodes.length > 0);

    expect(errors.join('\n')).toMatch(/not authenticated/i);
    expect(exitCodes).toEqual([1]);
  });
});

describe('a watch whose credential is refused', () => {
  it('renews again once the last renewal has had time to hold', async () => {
    const asked = await watchRecordingRenewals();

    await websocketOptions.onError(REFUSED);

    const started = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => started + 6 * 60_000);
    await websocketOptions.onError(REFUSED);

    expect(asked).toEqual(['tgoat_on_the_wire', 'tgoat_on_the_wire']);
    expect(exitCodes).toEqual([]);
  });

  it('keeps the allowance when the renewal could not reach the server', async () => {
    const asked = await watchRecordingRenewals(async () => {
      throw new Error('connect ECONNREFUSED');
    });

    await websocketOptions.onError(REFUSED);
    await websocketOptions.onError(REFUSED);

    expect(asked).toHaveLength(2);
    expect(exitCodes).toEqual([]);
  });

  it('adopts a session another process stored, even right after a renewal', async () => {
    let adoptions = 0;
    await watch({
      session: liveSession({
        adoptNewerSession: async () => {
          adoptions += 1;
          return true;
        },
      }),
    });

    await websocketOptions.onError(REFUSED);
    await websocketOptions.onError(REFUSED);

    expect(adoptions).toBe(1);
    expect(exitCodes).toEqual([]);
  });

  it('keeps the allowance when the tokens came from another process', async () => {
    const asked = await watchRecordingRenewals(async () => 'adopted');

    await websocketOptions.onError(REFUSED);
    await websocketOptions.onError(REFUSED);

    expect(asked).toHaveLength(2);
    expect(exitCodes).toEqual([]);
  });

  it('renews against the token the refused connection carried', async () => {
    const asked = await watchRecordingRenewals();

    await websocketOptions.onError(REFUSED);

    expect(asked).toEqual(['tgoat_on_the_wire']);
  });
});
