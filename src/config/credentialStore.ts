import { join, dirname } from 'path';
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';

import { CONFIG_PATH } from '../constants.js';
import { withStoreLock } from './storeLock.js';

export type Token = { token: string; expires: number };
export type ProjectDetails = { name: string };

export type OAuthSession = {
  type: 'oauth';
  accessToken: string;
  accessExpires: number;
  refreshToken: string;
  scopes: string[];
  userName?: string;
  /** The instance that issued this session; the hostname key cannot say which scheme or port reached it. */
  apiUrl: string;
};

/**
 * A user slot with no `type` is a personal access token: that is what every file written before browser login existed
 * holds, and those files must keep parsing forever.
 */
export type UserCredentials = Token | OAuthSession;

export type HostCredentials = {
  user?: UserCredentials;
  // keys cannot be numeric values in JSON
  projects?: Record<string, Token | undefined>;
  projectDetails?: Record<string, ProjectDetails>;
};

export type Store = {
  [scope: string]: HostCredentials;
};

export function isOAuthSession(user: UserCredentials): user is OAuthSession {
  return 'type' in user && user.type === 'oauth';
}

export interface CredentialStore {
  list(): Promise<Store>;
  get(host: string): Promise<HostCredentials | undefined>;
  /**
   * The only way to change a host's credentials; see storeLock for why the read
   * and the write are one section.
   */
  update<T>(host: string, change: Change<T>): Promise<T>;
  delete(host: string): Promise<void>;
  clear(): Promise<void>;
}

export type Change<T> = (current: HostCredentials) => Promise<ChangeResult<T>>;

export type ChangeResult<T> = {
  next?: HostCredentials;
  result: T;
};

export const fileCredentialStore: CredentialStore = {
  list: readAll,

  async get(host) {
    const store = await readAll();
    return store[host];
  },

  update(host, change) {
    return withStoreLock(async () => {
      const store = await readAll();
      const { next, result } = await change(store[host] ?? {});
      if (next) {
        await writeAll(
          holdsNothing(next) ? without(store, host) : { ...store, [host]: next }
        );
      }
      return result;
    });
  },

  async delete(host) {
    return withStoreLock(async () => {
      const store = await readAll();
      delete store[host];
      await writeAll(store);
    });
  },

  async clear() {
    return withStoreLock(() => writeAll({}));
  },
};

function without(store: Store, host: string): Store {
  const { [host]: _dropped, ...others } = store;
  return others;
}

function holdsNothing(host: HostCredentials) {
  const keys = Object.values(host.projects ?? {}).filter(Boolean);
  return !host.user && keys.length === 0;
}

const API_TOKENS_FILE = join(CONFIG_PATH, 'authentication.json');

async function ensureConfigPath() {
  await mkdir(dirname(API_TOKENS_FILE), { recursive: true });
}

async function readAll(): Promise<Store> {
  try {
    await ensureConfigPath();
    const storeData = await readFile(API_TOKENS_FILE, 'utf8');
    return JSON.parse(storeData);
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }

  return {};
}

async function writeAll(store: Store): Promise<void> {
  await ensureConfigPath();
  // A crash mid-write would otherwise leave the tokens truncated.
  const pending = `${API_TOKENS_FILE}.${process.pid}.tmp`;
  await writeFile(pending, JSON.stringify(store), {
    mode: 0o600,
    encoding: 'utf8',
  });
  await renameOverStore(pending);
}

// Windows refuses to replace a file another process has open, and reads take
// no lock, so a rotation can land while a sibling command is reading.
async function renameOverStore(pending: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(pending, API_TOKENS_FILE);
      return;
    } catch (e: any) {
      if (!RETRIABLE_RENAME_ERRORS.has(e.code) || attempt >= RENAME_ATTEMPTS) {
        await rm(pending, { force: true });
        throw e;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RENAME_RETRY_MS * attempt)
      );
    }
  }
}

const RETRIABLE_RENAME_ERRORS = new Set(['EPERM', 'EACCES', 'EBUSY']);
const RENAME_ATTEMPTS = 5;
const RENAME_RETRY_MS = 20;
