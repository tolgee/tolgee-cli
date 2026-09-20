import type {
  ApiKeyInfo,
  ApiKeyProject,
} from '../client/getApiKeyInformation.js';
import { warn } from '../utils/logger.js';
import {
  fileCredentialStore,
  isOAuthSession,
  type CredentialStore,
  type HostCredentials,
  type Token,
  type UserCredentials,
} from './credentialStore.js';

export type {
  HostCredentials,
  OAuthSession,
  ProjectDetails,
  Store,
  Token,
  UserCredentials,
} from './credentialStore.js';
export { isOAuthSession } from './credentialStore.js';

const store: CredentialStore = fileCredentialStore;

export async function loadStore() {
  return store.list();
}

async function updateHost(
  instance: URL,
  update: (current: HostCredentials) => HostCredentials
) {
  const current = (await store.get(instance.hostname)) ?? {};
  return store.set(instance.hostname, update(current));
}

async function storeUser(instance: URL, user?: UserCredentials) {
  return updateHost(instance, (current) => ({ ...current, user }));
}

async function storePak(
  instance: URL,
  project: ApiKeyProject,
  pak?: Token
): Promise<void> {
  const id = project.id.toString(10);
  return updateHost(instance, (current) => ({
    ...current,
    projects: { ...(current.projects || {}), [id]: pak },
    projectDetails: {
      ...(current.projectDetails || {}),
      [id]: { name: project.name },
    },
  }));
}

async function removePak(instance: URL, projectId: number) {
  const id = projectId.toString(10);
  return updateHost(instance, (current) => {
    delete current.projects?.[id];
    delete current.projectDetails?.[id];
    return current;
  });
}

export async function savePat(instance: URL, pat?: Token) {
  return storeUser(instance, pat);
}

export async function savePak(
  instance: URL,
  project: ApiKeyProject,
  pak?: Token
) {
  return storePak(instance, project, pak);
}

export async function getApiKey(
  apiUrl: string,
  projectId: number
): Promise<string | null> {
  const apiUrlObj = new URL(apiUrl);
  const scopedStore = await store.get(apiUrlObj.hostname);

  if (!scopedStore) {
    return null;
  }

  const user = scopedStore.user;
  if (user && !isOAuthSession(user)) {
    if (user.expires !== 0 && Date.now() > user.expires) {
      warn(`Your personal access token for ${apiUrlObj.hostname} expired.`);
      await storeUser(apiUrlObj, undefined);
      return null;
    }

    return user.token;
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
      await removePak(apiUrlObj, projectId);
      return null;
    }

    return pak.token;
  }

  return null;
}

export async function saveApiKey(instance: URL, token: ApiKeyInfo) {
  if (token.type === 'PAT') {
    return storeUser(instance, {
      token: token.key,
      expires: token.expires,
    });
  }

  return storePak(instance, token.project, {
    token: token.key,
    expires: token.expires,
  });
}

export async function removeApiKeys(api: URL) {
  return store.delete(api.hostname);
}

export async function clearAuthStore() {
  return store.clear();
}
