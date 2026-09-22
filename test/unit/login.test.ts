import { Command } from 'commander';
import { Login, Logout } from '#cli/commands/login.js';
import { API_URL_OPT, EXTRA_HEADER, PROJECT_ID_OPT } from '#cli/options.js';
import { createTolgeeClient } from '#cli/client/TolgeeClient.js';
import {
  clearAuthStore,
  removeApiKeys,
  removeProjectKey,
  saveOAuthSession,
  saveUserName,
} from '#cli/config/credentials.js';
import { browserLogin } from '#cli/oauth/browserLogin.js';
import { revokeAllSessions, revokeSessionFor } from '#cli/oauth/revoke.js';

vi.mock('#cli/client/TolgeeClient.js', () => ({
  createTolgeeClient: vi.fn(() => ({
    getApiKeyInfo: vi.fn().mockResolvedValue({
      type: 'PAT',
      key: 'tgpat_test',
      username: 'tester',
      expires: 0,
    }),
    GET: vi.fn().mockResolvedValue({
      data: { name: 'Sleepy Cat', username: 'sleepycat' },
    }),
  })),
  handleLoadableError: vi.fn(),
}));

vi.mock('#cli/config/credentials.js', () => ({
  saveApiKey: vi.fn(),
  clearAuthStore: vi.fn(),
  removeApiKeys: vi.fn(),
  removeProjectKey: vi.fn(),
  saveOAuthSession: vi.fn(),
  saveUserName: vi.fn(),
}));

vi.mock('#cli/oauth/revoke.js', () => ({
  revokeSessionFor: vi.fn(),
  revokeAllSessions: vi.fn(),
}));

vi.mock('#cli/oauth/browserLogin.js', () => ({
  browserLogin: vi.fn().mockResolvedValue({
    accessToken: 'tgoat_access',
    refreshToken: 'tgort_refresh',
    accessExpires: 1234,
    scopes: ['translations.edit'],
    projectId: 12,
  }),
}));

const mockedCreateClient = vi.mocked(createTolgeeClient);
const mockedBrowserLogin = vi.mocked(browserLogin);
const mockedSaveSession = vi.mocked(saveOAuthSession);

async function run(command: typeof Login, config: any, args: string[]) {
  const program = new Command();
  program.addOption(API_URL_OPT);
  program.addOption(EXTRA_HEADER);
  program.addOption(PROJECT_ID_OPT.default(config.projectId ?? -1));
  program.addCommand(command(config));
  await program.parseAsync(args, { from: 'user' });
}

const runLogin = (config: any, args: string[]) => run(Login, config, args);
const runLogout = (config: any, args: string[]) => run(Logout, config, args);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('login custom headers', () => {
  it('forwards merged config + CLI headers and the api key to the client', async () => {
    await runLogin({ headers: { 'x-config': 'c' } }, [
      '--api-url',
      'http://localhost',
      '-H',
      'X-Cli: v',
      'login',
      'tgpat_test',
    ]);

    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    const props = mockedCreateClient.mock.calls[0][0];
    expect(props.apiKey).toBe('tgpat_test');
    expect(props.headers).toEqual({ 'x-config': 'c', 'x-cli': 'v' });
  });

  it('does not pre-strip a custom x-api-key (the client arbitrates it)', async () => {
    await runLogin({}, [
      '--api-url',
      'http://localhost',
      '-H',
      'X-API-Key: bogus',
      'login',
      'tgpat_test',
    ]);

    const props = mockedCreateClient.mock.calls[0][0];
    expect(props.apiKey).toBe('tgpat_test');
    expect(props.headers).toEqual({ 'x-api-key': 'bogus' });
  });
});

describe('browser login', () => {
  it('signs in through the browser when no api key is given', async () => {
    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    expect(mockedBrowserLogin).toHaveBeenCalledTimes(1);
    expect(mockedBrowserLogin.mock.calls[0][0].apiUrl.hostname).toBe(
      'localhost'
    );
  });

  it('names the session after the user once it is stored', async () => {
    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    const [instance, userName] = vi.mocked(saveUserName).mock.calls[0];
    expect(instance.hostname).toBe('localhost');
    expect(userName).toBe('Sleepy Cat');
  });

  it('revokes the session it replaces, which is the last reference to that grant', async () => {
    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    const [instance] = vi.mocked(revokeSessionFor).mock.calls[0];
    expect(instance.hostname).toBe('localhost');
    expect(
      vi.mocked(revokeSessionFor).mock.invocationCallOrder[0]
    ).toBeLessThan(mockedSaveSession.mock.invocationCallOrder[0]);
  });

  it('stores the session before the greeting, which can fail on its own', async () => {
    mockedCreateClient.mockReturnValueOnce({
      GET: vi.fn().mockResolvedValue({
        error: { code: 'nope' },
        response: { status: 500 },
      }),
    } as any);

    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    expect(mockedSaveSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveUserName)).not.toHaveBeenCalled();
  });

  it('stores the token pair as the session for this instance', async () => {
    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    const [instance, session] = mockedSaveSession.mock.calls[0];
    expect(instance.hostname).toBe('localhost');
    expect(session).toEqual({
      type: 'oauth',
      accessToken: 'tgoat_access',
      refreshToken: 'tgort_refresh',
      accessExpires: 1234,
      scopes: ['translations.edit'],
      apiUrl: 'http://localhost/',
      projectId: 12,
    });
  });

  it('opens the consent screen on the configured project', async () => {
    await runLogin({ projectId: 12 }, [
      '--api-url',
      'http://localhost',
      'login',
    ]);

    expect(mockedBrowserLogin.mock.calls[0][0].project).toBe('12');
  });

  it('passes no project when none is configured', async () => {
    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    expect(mockedBrowserLogin.mock.calls[0][0].project).toBeUndefined();
  });
});

describe('api key login', () => {
  it('ends the session a personal access token replaces', async () => {
    await runLogin({}, [
      '--api-url',
      'http://localhost',
      'login',
      'tgpat_test',
    ]);

    expect(vi.mocked(revokeSessionFor)).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(revokeSessionFor).mock.invocationCallOrder[0]
    ).toBeGreaterThan(mockedCreateClient.mock.invocationCallOrder[0]);
  });

  it('keeps the session when the key turns out to be invalid', async () => {
    mockedCreateClient.mockReturnValueOnce({
      getApiKeyInfo: vi.fn().mockRejectedValue(new Error('invalid key')),
    } as any);

    await expect(
      runLogin({}, ['--api-url', 'http://localhost', 'login', 'tgpat_bad'])
    ).rejects.toThrow();

    expect(vi.mocked(revokeSessionFor)).not.toHaveBeenCalled();
  });

  it('leaves the session alone for a project api key', async () => {
    mockedCreateClient.mockReturnValueOnce({
      getApiKeyInfo: vi.fn().mockResolvedValue({
        type: 'PAK',
        key: 'tgpak_test',
        username: 'tester',
        project: { id: 1, name: 'Project 1' },
        expires: 0,
      }),
    } as any);

    await runLogin({}, [
      '--api-url',
      'http://localhost',
      'login',
      'tgpak_test',
    ]);

    expect(vi.mocked(revokeSessionFor)).not.toHaveBeenCalled();
  });

  it('does not open a browser when a key is given', async () => {
    await runLogin({}, [
      '--api-url',
      'http://localhost',
      'login',
      'tgpat_test',
    ]);

    expect(mockedBrowserLogin).not.toHaveBeenCalled();
  });
});

describe('logout --all', () => {
  it('ends the grant on every instance before clearing the machine', async () => {
    await runLogout({}, ['--api-url', 'http://localhost', 'logout', '--all']);

    expect(vi.mocked(revokeAllSessions)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(clearAuthStore)).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(revokeAllSessions).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(clearAuthStore).mock.invocationCallOrder[0]);
  });

  it('forwards the custom headers, naming the instance they belong to', async () => {
    await runLogout({ headers: { 'x-config': 'c' } }, [
      '--api-url',
      'http://localhost',
      '-H',
      'X-Cli: v',
      'logout',
      '--all',
    ]);

    const [instance, headers] = vi.mocked(revokeAllSessions).mock.calls[0];
    expect(instance!.hostname).toBe('localhost');
    expect(headers).toEqual({ 'x-config': 'c', 'x-cli': 'v' });
  });
});

describe('logout --project', () => {
  beforeEach(() => {
    vi.mocked(removeProjectKey).mockResolvedValue(true);
  });

  it('drops the key of the project named on the command line', async () => {
    await runLogout({}, [
      '--api-url',
      'http://localhost',
      '--project-id',
      '7',
      'logout',
      '--project',
    ]);

    const [instance, projectId] = vi.mocked(removeProjectKey).mock.calls[0];
    expect(instance.hostname).toBe('localhost');
    expect(projectId).toBe(7);
  });

  it('drops the key of the project the config names', async () => {
    await runLogout({ projectId: 42 }, [
      '--api-url',
      'http://localhost',
      'logout',
      '--project',
    ]);

    expect(vi.mocked(removeProjectKey).mock.calls[0][1]).toBe(42);
  });

  it('says nothing was there when no key was stored', async () => {
    vi.mocked(removeProjectKey).mockResolvedValueOnce(false);
    const printed: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((line: any) => {
      printed.push(String(line));
    });

    try {
      await runLogout({ projectId: 5 }, [
        '--api-url',
        'http://localhost',
        'logout',
        '--project',
      ]);

      expect(printed.join('\n')).toMatch(/No API key was stored for project 5/);
    } finally {
      log.mockRestore();
    }
  });

  it('keeps the session and the other projects', async () => {
    await runLogout({ projectId: 42 }, [
      '--api-url',
      'http://localhost',
      'logout',
      '--project',
    ]);

    expect(vi.mocked(revokeSessionFor)).not.toHaveBeenCalled();
    expect(vi.mocked(removeApiKeys)).not.toHaveBeenCalled();
    expect(vi.mocked(clearAuthStore)).not.toHaveBeenCalled();
  });

  it('says which option to pass when no project is known', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as any);
    try {
      await expect(
        runLogout({}, ['--api-url', 'http://localhost', 'logout', '--project'])
      ).rejects.toThrow('process.exit');

      expect(vi.mocked(removeProjectKey)).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
    }
  });
});
