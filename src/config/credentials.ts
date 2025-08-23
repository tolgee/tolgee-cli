import { join, dirname } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';

import type {
  ApiKeyInfo,
  ApiKeyProject,
} from '../client/getApiKeyInformation.js';
import { warn } from '../utils/logger.js';
import { CONFIG_PATH } from '../constants.js';

export type Token = { token: string; expires: number };
export type ProjectDetails = { name: string };

export type Store = {
  [scope: string]: {
    user?: Token;
    // keys cannot be numeric values in JSON
    projects?: Record<string, Token | undefined>;
    projectDetails?: Record<string, ProjectDetails>;
  };
};

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

export async function loadStore(): Promise<Store> {
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
  project: ApiKeyProject,
  pak?: Token
) {
  return saveStore({
    ...store,
    [instance.hostname]: {
      ...(store[instance.hostname] || {}),
      projects: {
        ...(store[instance.hostname]?.projects || {}),
        [project.id.toString(10)]: pak,
      },
      projectDetails: {
        ...(store[instance.hostname]?.projectDetails || {}),
        [project.id.toString(10)]: { name: project.name },
      },
    },
  });
}

async function removePak(store: Store, instance: URL, projectId: number) {
  delete store[instance.hostname].projects?.[projectId.toString(10)];
  delete store[instance.hostname].projectDetails?.[projectId.toString(10)];
  return saveStore(store);
}

export async function savePat(instance: URL, pat?: Token) {
  const store = await loadStore();
  return storePat(store, instance, pat);
}

export async function savePak(
  instance: URL,
  project: ApiKeyProject,
  pak?: Token
) {
  const store = await loadStore();
  return storePak(store, instance, project, pak);
}

export async function getApiKey(
  apiUrl: string,
  projectId: number
): Promise<string | null> {
  const store = await loadStore();

  const apiUrlObj = new URL(apiUrl);

  if (!store[apiUrlObj.hostname]) {
    return null;
  }

  const scopedStore = store[apiUrlObj.hostname];
  if (scopedStore.user) {
    if (
      scopedStore.user.expires !== 0 &&
      Date.now() > scopedStore.user.expires
    ) {
      warn(`Your personal access token for ${apiUrlObj.hostname} expired.`);
      await storePat(store, apiUrlObj, undefined);
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
        `Your project API key for project #${projectId} on ${apiUrlObj.hostname} expired.`
      );
      await removePak(store, apiUrlObj, projectId);
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

  return storePak(store, instance, token.project, {
    token: token.key,
    expires: token.expires,
  });
}

export async function removeApiKeys(api: URL) {
  const store = await loadStore();
  delete store[api.hostname];

  return saveStore(store);
}

export async function clearAuthStore() {
  return saveStore({});
}
