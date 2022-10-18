import { join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';

import { getConfigPath } from './utils/path';

type TolgeeConfig = {
  apiUrl?: URL;
  projectId?: number;
};

const CONFIG_PATH = join(getConfigPath(), 'tolgee');
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

async function loadStore() {
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

export async function loadAuthToken(url: URL): Promise<string | null> {
  const store = await loadStore();
  return store[url.href] || null;
}

export async function storeAuthToken(api: URL, token: string | null) {
  const store = await loadStore();

  if (token) {
    store[api.href] = token;
  } else {
    delete store[api.href];
  }

  await writeFile(API_TOKENS_FILE, JSON.stringify(store), {
    mode: 0o600,
    encoding: 'utf8',
  });
}

export async function clearAuthStore() {
  await writeFile(API_TOKENS_FILE, '{}', {
    mode: 0o600,
    encoding: 'utf8',
  });
}
