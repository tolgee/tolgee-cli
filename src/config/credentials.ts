import type { ApiKeyInfo } from '../client';

import { join, dirname } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';

import { warn } from '../utils/logger';
import { CONFIG_PATH } from '../constants';

type Token = { token: string; expires: number };

type Store = {
  [scope: string]: {
    user?: Token;
    // keys cannot be numeric values in JSON
    projects?: Record<string, Token | undefined>;
  };
};

export const API_TOKENS_FILE = join(CONFIG_PATH, 'authentication.json');

async function ensureConfigPath() {
  try {
    await mkdir(dirname(API_TOKENS_FILE));
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

async function loadStore(): Promise<Store> {
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

async function saveStore(store: Store): Promise<void> {
  const blob = JSON.stringify(store);
  await writeFile(API_TOKENS_FILE, blob, {
    mode: 0o600,
    encoding: 'utf8',
  });
}

async function storePat(store: Store, instance: URL, pat?: Token) {
  return saveStore({
    ...store,
    [instance.hostname]: {
      ...(store[instance.hostname] || {}),
      user: pat,
    },
  });
}

async function storePak(
  store: Store,
  instance: URL,
  projectId: number,
  pak?: Token
) {
  return saveStore({
    ...store,
    [instance.hostname]: {
      ...(store[instance.hostname] || {}),
      projects: {
        ...(store[instance.hostname]?.projects || {}),
        [projectId.toString(10)]: pak,
      },
    },
  });
}

export async function savePat(instance: URL, pat?: Token) {
  const store = await loadStore();
  return storePat(store, instance, pat);
}

export async function savePak(instance: URL, projectId: number, pak?: Token) {
  const store = await loadStore();
  return storePak(store, instance, projectId, pak);
}

export async function getApiKey(
  instance: URL,
  projectId: number
): Promise<string | null> {
  const store = await loadStore();
  if (!store[instance.hostname]) {
    return null;
  }

  const scopedStore = store[instance.hostname];
  if (scopedStore.user) {
    if (
      scopedStore.user.expires !== 0 &&
      Date.now() > scopedStore.user.expires
    ) {
      warn(`Your personal access token for ${instance.hostname} expired.`);
      await storePat(store, instance, undefined);
      return null;
    }

    return scopedStore.user.token;
  }

  if (projectId <= 0) {
    return null;
  }

  const pak = scopedStore.projects?.[projectId.toString(10)];
  if (pak) {
    if (pak.expires !== 0 && Date.now() > pak.expires) {
      warn(
        `Your project API key for project #${projectId} on ${instance.hostname} expired.`
      );
      await storePak(store, instance, projectId, undefined);
      return null;
    }

    return pak.token;
  }

  return null;
}

export async function saveApiKey(instance: URL, token: ApiKeyInfo) {
  const store = await loadStore();

  if (token.type === 'PAT') {
    return storePat(store, instance, {
      token: token.key,
      expires: token.expires,
    });
  }

  return storePak(store, instance, token.project.id, {
    token: token.key,
    expires: token.expires,
  });
}

export async function removeApiKeys(api: URL) {
  const store = await loadStore();
  return saveStore({
    ...store,
    [api.hostname]: {},
  });
}

export async function clearAuthStore() {
  return saveStore({});
}
