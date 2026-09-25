import { join, dirname } from 'path';
import { mkdir, open, readFile, rm, stat } from 'fs/promises';

import { CONFIG_PATH, OAUTH_REQUEST_TIMEOUT_MS } from '../constants.js';
import { debug, info } from '../utils/logger.js';

const LOCK_FILE = join(CONFIG_PATH, 'authentication.json.lock');

// Above a holder's own network budget, so a waiter cannot break a lock that is
// merely slow.
const STALE_MS = 3 * OAUTH_REQUEST_TIMEOUT_MS;
const POLL_MS = 50;
const SAY_WAITING_AFTER_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Holder = { content: string; pid: number | undefined; mtimeMs: number };

/**
 * Two CLI processes rotating one refresh token both spend it, and the server
 * answers the second with revocation.
 */
export async function withStoreLock<T>(run: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await run();
  } finally {
    await release();
  }
}

async function acquire() {
  await mkdir(dirname(LOCK_FILE), { recursive: true });
  const started = Date.now();
  let saidWaiting = false;

  for (;;) {
    if (await create()) {
      return;
    }
    const holder = await readHolder();
    if (holder && isAbandoned(holder)) {
      await breakLock(holder);
      continue;
    }
    if (!saidWaiting && Date.now() - started > SAY_WAITING_AFTER_MS) {
      info(
        'Waiting for another tolgee process to finish updating the stored credentials...'
      );
      saidWaiting = true;
    }
    await sleep(POLL_MS);
  }
}

/**
 * Whether the lock is ours once created. A waiter that judged the previous
 * holder dead can remove this file right after it appears and create its own;
 * the pid the file holds afterwards says who won.
 */
async function create(): Promise<boolean> {
  try {
    const handle = await open(LOCK_FILE, 'wx');
    await handle.writeFile(String(process.pid));
    await handle.close();
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
    return false;
  }
  return (await readHolder())?.pid === process.pid;
}

async function readHolder(): Promise<Holder | undefined> {
  try {
    const content = await readFile(LOCK_FILE, 'utf8');
    const { mtimeMs } = await stat(LOCK_FILE);
    const pid = Number(content);
    return {
      content,
      pid: Number.isInteger(pid) && pid > 0 ? pid : undefined,
      mtimeMs,
    };
  } catch (e: any) {
    // Gone between the failed create and the read: whoever held it has
    // finished, so the next attempt will take it.
    if (e.code === 'ENOENT') {
      return undefined;
    }
    throw e;
  }
}

/** A holder killed mid-write never removes its lock. */
function isAbandoned(holder: Holder): boolean {
  if (holder.pid !== undefined && !isRunning(holder.pid)) {
    return true;
  }
  return Date.now() - holder.mtimeMs > STALE_MS;
}

/**
 * Removes the lock only while it still holds what was judged abandoned:
 * another waiter may have broken it first and written its own pid.
 */
async function breakLock(judged: Holder) {
  const current = await readHolder();
  if (current === undefined || current.content !== judged.content) {
    return;
  }
  debug('[STORE] Breaking a credential store lock its holder left behind');
  await rm(LOCK_FILE, { force: true });
}

/** A lock a waiter has since taken over, judging this process stale, is theirs. */
async function release() {
  if ((await readHolder())?.pid !== process.pid) {
    debug('[STORE] The credential store lock was taken over; leaving it');
    return;
  }
  await rm(LOCK_FILE, { force: true });
}

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code !== 'ESRCH';
  }
}
