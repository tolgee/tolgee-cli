import { SessionExpiredError } from '#cli/oauth/session.js';
import { OAuthError } from '#cli/oauth/authServer.js';

const errors: string[] = [];

vi.mock('#cli/utils/logger.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#cli/utils/logger.js')>()),
  error: (message: string) => errors.push(String(message)),
  exitWithError: (message: string | Error) => {
    errors.push(String(message instanceof Error ? message.message : message));
    throw new Error('exit');
  },
}));

type Module = typeof import('#cli/utils/reportError.js');
let reportError: Module['reportError'];

beforeAll(async () => {
  ({ reportError } = await import('#cli/utils/reportError.js'));
});

beforeEach(() => {
  errors.length = 0;
});

describe('what the user is told', () => {
  it('asks a user with a dead session to sign in again, not to file a bug', () => {
    expect(() => reportError(new SessionExpiredError())).toThrow('exit');

    expect(errors.join('\n')).toMatch(/session has expired/i);
    expect(errors.join('\n')).not.toMatch(/issue tracker/i);
  });

  it('reports an unreachable authorization server as itself', () => {
    expect(() =>
      reportError(new OAuthError('Could not reach tolgee.example', 'network'))
    ).toThrow('exit');

    expect(errors.join('\n')).toContain('Could not reach tolgee.example');
    expect(errors.join('\n')).not.toMatch(/issue tracker/i);
  });

  it('still asks for a bug report for anything unexpected', () => {
    expect(() => reportError(new Error('boom'))).toThrow('exit');

    expect(errors.join('\n')).toMatch(/issue tracker/i);
  });
});
