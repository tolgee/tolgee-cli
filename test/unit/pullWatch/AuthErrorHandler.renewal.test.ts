import { AuthErrorHandler } from '#cli/utils/pullWatch/AuthErrorHandler.js';
import { SessionExpiredError } from '#cli/oauth/session.js';

const UNAUTHENTICATED = { headers: { message: 'Unauthenticated' } };

function handler(renewCredential?: () => Promise<boolean>) {
  const client = {
    GET: vi.fn().mockResolvedValue({ response: { headers: new Headers() } }),
  } as any;
  return AuthErrorHandler(client, { renewCredential });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a websocket that refuses the credential', () => {
  it('keeps the watch when the renewal succeeded', async () => {
    const shutdown = vi.fn();

    await handler(async () => true).handleAuthErrors(UNAUTHENTICATED, shutdown);

    expect(shutdown).not.toHaveBeenCalled();
  });

  it('ends the watch when the rotation produced nothing new', async () => {
    const shutdown = vi.fn();

    await handler(async () => false).handleAuthErrors(
      UNAUTHENTICATED,
      shutdown
    );

    expect(shutdown).toHaveBeenCalledWith(1);
  });

  it('ends the watch, with the reason, when the renewal throws', async () => {
    const shutdown = vi.fn();
    const errors: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: any[]) =>
      errors.push(args.map(String).join(' '))
    );

    await handler(async () => {
      throw new SessionExpiredError();
    }).handleAuthErrors(UNAUTHENTICATED, shutdown);

    expect(shutdown).toHaveBeenCalledWith(1);
    expect(errors.join('\n')).toMatch(/session has expired/i);
  });

  it('keeps the watch when the rotation merely fails to reach the server', async () => {
    const shutdown = vi.fn();

    await handler(async () => {
      throw new Error('connect ECONNREFUSED');
    }).handleAuthErrors(UNAUTHENTICATED, shutdown);

    expect(shutdown).not.toHaveBeenCalled();
  });

  it('ends the watch when there is no credential to renew', async () => {
    const shutdown = vi.fn();

    await handler().handleAuthErrors(UNAUTHENTICATED, shutdown);

    expect(shutdown).toHaveBeenCalledWith(1);
  });
});
