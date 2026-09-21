import { Command } from 'commander';
import { Login } from '#cli/commands/login.js';
import { API_URL_OPT, EXTRA_HEADER, PROJECT_ID_OPT } from '#cli/options.js';
import { createTolgeeClient } from '#cli/client/TolgeeClient.js';
import { saveOAuthSession } from '#cli/config/credentials.js';
import { browserLogin } from '#cli/oauth/browserLogin.js';

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
  saveOAuthSession: vi.fn(),
}));

vi.mock('#cli/oauth/browserLogin.js', () => ({
  browserLogin: vi.fn().mockResolvedValue({
    accessToken: 'tgoat_access',
    refreshToken: 'tgort_refresh',
    accessExpires: 1234,
    scopes: ['translations.edit'],
  }),
}));

const mockedCreateClient = vi.mocked(createTolgeeClient);
const mockedBrowserLogin = vi.mocked(browserLogin);
const mockedSaveSession = vi.mocked(saveOAuthSession);

async function runLogin(config: any, args: string[]) {
  const program = new Command();
  program.addOption(API_URL_OPT);
  program.addOption(EXTRA_HEADER);
  program.addOption(PROJECT_ID_OPT.default(config.projectId ?? -1));
  program.addCommand(Login(config));
  await program.parseAsync(args, { from: 'user' });
}

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

  it('stores the pair as a browser session, named after the user', async () => {
    await runLogin({}, ['--api-url', 'http://localhost', 'login']);

    const [instance, session] = mockedSaveSession.mock.calls[0];
    expect(instance.hostname).toBe('localhost');
    expect(session).toEqual({
      type: 'oauth',
      accessToken: 'tgoat_access',
      refreshToken: 'tgort_refresh',
      accessExpires: 1234,
      userName: 'Sleepy Cat',
      // Recorded so `logout --all` can address this instance again; the store is keyed by hostname alone.
      apiUrl: 'http://localhost/',
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

  it('leaves the api key login alone', async () => {
    await runLogin({}, [
      '--api-url',
      'http://localhost',
      'login',
      'tgpat_test',
    ]);

    expect(mockedBrowserLogin).not.toHaveBeenCalled();
  });
});
