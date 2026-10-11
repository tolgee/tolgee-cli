vi.mock('#cli/utils/eTagStorage.js', () => ({ setETag: vi.fn() }));
vi.mock('#cli/utils/logger.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#cli/utils/logger.js')>()),
  debug: () => {},
  error: () => {},
}));

import { setETag } from '#cli/utils/eTagStorage.js';
import { pullScheduler } from '#cli/utils/pullWatch/pullScheduler.js';
import { SessionExpiredError } from '#cli/oauth/session.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

let pulls: number;
let release: (() => void) | undefined;

function scheduler(
  doPull: () => Promise<void> = async () => {
    pulls += 1;
  },
  onCredentialDied = vi.fn()
) {
  return {
    pulls: pullScheduler({ projectId: 7, doPull, onCredentialDied }),
    onCredentialDied,
  };
}

/** A pull that stays in flight until the test lets it finish. */
async function blockingPull() {
  pulls += 1;
  await new Promise<void>((resolve) => {
    release = resolve;
  });
}

beforeEach(() => {
  // setImmediate stays real: it is what lets a scheduled pull settle.
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
    ],
  });
  vi.mocked(setETag).mockClear();
  pulls = 0;
  release = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pull scheduling', () => {
  it('pulls at once when nothing ran recently', async () => {
    const { pulls: scheduled } = scheduler();

    scheduled.schedulePull();
    await flush();

    expect(pulls).toBe(1);
  });

  it('holds a pull asked for right after another until the window passes', async () => {
    const { pulls: scheduled } = scheduler();
    scheduled.schedulePull();
    await flush();

    scheduled.schedulePull();
    await flush();
    expect(pulls).toBe(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(pulls).toBe(2);
  });

  it('runs one more pull after a change that arrived mid-pull', async () => {
    const { pulls: scheduled } = scheduler(blockingPull);
    scheduled.schedulePull();
    await flush();
    expect(pulls).toBe(1);

    scheduled.schedulePull('etag-2');
    await vi.advanceTimersByTimeAsync(500);
    expect(pulls).toBe(1);

    release!();
    await flush();
    await flush();
    expect(pulls).toBe(2);
  });

  it('remembers the etag of a pull that succeeded', async () => {
    const { pulls: scheduled } = scheduler();

    scheduled.schedulePull('etag-1');
    await flush();

    expect(setETag).toHaveBeenCalledWith(7, 'etag-1');
  });

  it('polls as a backup once a minute', async () => {
    const { pulls: scheduled } = scheduler();

    scheduled.startPolling();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(pulls).toBe(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(pulls).toBe(2);

    scheduled.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(pulls).toBe(2);
  });

  it('hands a dead session to the caller instead of logging it', async () => {
    const { pulls: scheduled, onCredentialDied } = scheduler(async () => {
      throw new SessionExpiredError();
    });

    scheduled.schedulePull();
    await flush();

    expect(onCredentialDied).toHaveBeenCalledWith(
      expect.any(SessionExpiredError)
    );
  });
});
