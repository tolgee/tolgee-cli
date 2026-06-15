import { Command } from 'commander';
import { Login } from '#cli/commands/login.js';
import { API_URL_OPT, EXTRA_HEADER } from '#cli/options.js';
import { createTolgeeClient } from '#cli/client/TolgeeClient.js';

vi.mock('#cli/client/TolgeeClient.js', () => ({
  createTolgeeClient: vi.fn(() => ({
    getApiKeyInfo: vi.fn().mockResolvedValue({
      type: 'PAT',
      key: 'tgpat_test',
      username: 'tester',
      expires: 0,
    }),
  })),
}));

vi.mock('#cli/config/credentials.js', () => ({
  saveApiKey: vi.fn(),
  clearAuthStore: vi.fn(),
  removeApiKeys: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createTolgeeClient);

async function runLogin(config: any, args: string[]) {
  const program = new Command();
  program.addOption(API_URL_OPT);
  program.addOption(EXTRA_HEADER);
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
