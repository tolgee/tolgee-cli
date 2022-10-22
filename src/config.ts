import type { ApiKeyInfo } from './client';

import { join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';

import { CONFIG_PATH } from './utils/constants';

type Store = {
  [scope: string]: {
    user?: string;
    // keys cannot be numeric values in JSON
    projects?: Record<string, string>;
  };
};

export type TolgeeConfig = {
  apiUrl?: URL;
  projectId?: number;
};

const API_TOKENS_FILE = join(CONFIG_PATH, 'authentication.json');

const explorer = cosmiconfig('tolgee', {
  loaders: {
    noExt: defaultLoaders['.json'],
  },
});

async function ensureConfigPath() {
  try {
    await mkdir(CONFIG_PATH);
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

function parseConfig(rc: any): TolgeeConfig {
  if (typeof rc !== 'object' || Array.isArray(rc)) {
    throw new Error('Invalid config: config is not an object.');
  }

  const cfg: TolgeeConfig = {};
  if ('apiUrl' in rc) {
    if (typeof rc.apiUrl !== 'string')
      throw new Error('Invalid config: apiUrl is not a string');
    cfg.apiUrl = new URL(rc.apiUrl);
  }

  if ('projectId' in rc) {
    if (typeof rc.projectId !== 'number')
      throw new Error('Invalid config: projectId is not a number');
    cfg.projectId = rc.projectId;
  }

  return cfg;
}

export async function loadTolgeeRc(): Promise<TolgeeConfig | null> {
  const res = await explorer.search();
  if (!res || res.isEmpty) return null;

  return parseConfig(res.config);
}

export async function getApiKey(
  url: URL,
  projectId: number
): Promise<string | null> {
  const store = await loadStore();
  if (!store[url.hostname]) return null;

  const scopedStore = store[url.href];
  if (scopedStore.user) return scopedStore.user;

  if (projectId <= 0) return null;

  const pak = scopedStore.projects?.[projectId.toString(10)];
  return pak || null;
}

export async function saveApiKey(api: URL, token: ApiKeyInfo) {
  const store = await loadStore();

  if (token.type === 'PAT') {
    return saveStore({
      ...store,
      [api.hostname]: {
        ...(store[api.hostname] || {}),
        user: token.key,
      },
    });
  }

  const projectId = token.project.id.toString(10);
  return saveStore({
    ...store,
    [api.hostname]: {
      ...(store[api.hostname] || {}),
      projects: {
        ...(store[api.hostname]?.projects || {}),
        [projectId]: token.key,
      },
    },
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
