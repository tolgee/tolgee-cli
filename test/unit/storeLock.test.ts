import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { rm, utimes, writeFile } from 'fs/promises';

type LockModule = typeof import('#cli/config/storeLock.js');

const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'tolgee-cli-lock-'));
process.env.TOLGEE_CLI_CONFIG_PATH = CONFIG_DIR;

const LOCK_FILE = join(CONFIG_DIR, 'authentication.json.lock');

let withStoreLock: LockModule['withStoreLock'];

beforeAll(async () => {
  ({ withStoreLock } = await import('#cli/config/storeLock.js'));
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('credential store lock', () => {
  // Mutual exclusion, not a queue: which holder wins is whichever creates the
  // file first, and nothing promises that is the one that asked first.
  it('never lets two holders overlap', async () => {
    const order: string[] = [];
    const hold = (name: string, ms: number) =>
      withStoreLock(async () => {
        order.push(`${name} in`);
        await sleep(ms);
        order.push(`${name} out`);
      });

    await Promise.all([hold('a', 40), hold('b', 10)]);

    expect(order).toHaveLength(4);
    expect(order[1]).toBe(`${order[0].split(' ')[0]} out`);
    expect(order[3]).toBe(`${order[2].split(' ')[0]} out`);
  });

  it('releases the lock when the work throws', async () => {
    await expect(
      withStoreLock(async () => {
        throw new Error('nope');
      })
    ).rejects.toThrow('nope');

    await expect(withStoreLock(async () => 'through')).resolves.toBe('through');
  });

  it('breaks a lock left behind by a dead process', async () => {
    await writeFile(LOCK_FILE, '');
    const ancient = new Date(Date.now() - 10 * 60_000);
    await utimes(LOCK_FILE, ancient, ancient);

    await expect(withStoreLock(async () => 'through')).resolves.toBe('through');
  });

  it('breaks a lock whose holder is gone, without waiting for it to age', async () => {
    // Above every platform's pid range, so no process can hold it.
    await writeFile(LOCK_FILE, String(2 ** 22 + 1));

    const outcome = await Promise.race([
      withStoreLock(async () => 'through'),
      sleep(1_000).then(() => 'still waiting'),
    ]);

    expect(outcome).toBe('through');
  });

  it('waits for a holder that is still running', async () => {
    await writeFile(LOCK_FILE, String(process.pid));

    const waiting = withStoreLock(async () => 'through');
    const outcome = await Promise.race([
      waiting,
      sleep(150).then(() => 'still waiting'),
    ]);

    expect(outcome).toBe('still waiting');

    await rm(LOCK_FILE, { force: true });
    await waiting;
  });

  it('waits for a lock that is merely slow', async () => {
    await writeFile(LOCK_FILE, '');
    const held = new Date(Date.now() - 45_000);
    await utimes(LOCK_FILE, held, held);

    const waiting = withStoreLock(async () => 'through');
    const outcome = await Promise.race([
      waiting,
      sleep(150).then(() => 'still waiting'),
    ]);

    expect(outcome).toBe('still waiting');

    await rm(LOCK_FILE, { force: true });
    await waiting;
  });
});
