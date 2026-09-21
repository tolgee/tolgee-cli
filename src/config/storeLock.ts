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

/**
 * Two CLI processes rotating one refresh token both spend it, and the server
 * answers the second with revocation.
 */
export async function withStoreLock<T>(run: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await run();
  } finally {
    await rm(LOCK_FILE, { force: true });
  }
}

async function acquire() {
  await mkdir(dirname(LOCK_FILE), { recursive: true });
  const started = Date.now();
  let saidWaiting = false;

  for (;;) {
    try {
      const handle = await open(LOCK_FILE, 'wx');
      await handle.writeFile(String(process.pid));
      await handle.close();
      return;
    } catch (e: any) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
      if (await isAbandoned()) {
        debug(
          '[STORE] Breaking a credential store lock its holder left behind'
        );
        await rm(LOCK_FILE, { force: true });
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
}

/** A holder killed mid-write never removes its lock. */
async function isAbandoned() {
  try {
    const holder = Number(await readFile(LOCK_FILE, 'utf8'));
    if (Number.isInteger(holder) && holder > 0 && !isRunning(holder)) {
      return true;
    }
    const { mtimeMs } = await stat(LOCK_FILE);
    return Date.now() - mtimeMs > STALE_MS;
  } catch (e: any) {
    // Gone between the failed create and the read: whoever held it has
    // finished, so the next attempt will take it.
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code !== 'ESRCH';
  }
}
