import { join, dirname } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';

import { CONFIG_PATH } from '../constants.js';

export type Token = { token: string; expires: number };
export type ProjectDetails = { name: string };

export type OAuthSession = {
  type: 'oauth';
  accessToken: string;
  accessExpires: number;
  refreshToken: string;
  userName?: string;
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
  set(host: string, credentials: HostCredentials): Promise<void>;
  delete(host: string): Promise<void>;
  clear(): Promise<void>;
}

const API_TOKENS_FILE = join(CONFIG_PATH, 'authentication.json');

async function ensureConfigPath() {
  try {
    await mkdir(dirname(API_TOKENS_FILE));
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
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
  const blob = JSON.stringify(store);
  await writeFile(API_TOKENS_FILE, blob, {
    mode: 0o600,
    encoding: 'utf8',
  });
}

export const fileCredentialStore: CredentialStore = {
  list: readAll,

  async get(host) {
    const store = await readAll();
    return store[host];
  },

  async set(host, credentials) {
    const store = await readAll();
    return writeAll({ ...store, [host]: credentials });
  },

  async delete(host) {
    const store = await readAll();
    delete store[host];
    return writeAll(store);
  },

  async clear() {
    return writeAll({});
  },
};
