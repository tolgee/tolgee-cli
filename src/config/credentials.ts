import type {
  ApiKeyInfo,
  ApiKeyProject,
} from '../client/getApiKeyInformation.js';
import { warn } from '../utils/logger.js';
import { tryParseUrl } from '../utils/url.js';
import {
  fileCredentialStore,
  isOAuthSession,
  type Change,
  type CredentialStore,
  type HostCredentials,
  type OAuthSession,
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

export async function getHostCredentials(apiUrl: URL) {
  return store.get(apiUrl.hostname);
}

/** The session in this instance's slot, whichever instance issued it. */
export async function storedSessionFor(
  apiUrl: URL
): Promise<OAuthSession | undefined> {
  const user = (await getHostCredentials(apiUrl))?.user;
  return user && isOAuthSession(user) ? user : undefined;
}

async function updateHost(
  instance: URL,
  update: (current: HostCredentials) => HostCredentials
) {
  return store.update(instance.hostname, async (current) => ({
    next: update(current),
    result: undefined,
  }));
}

async function storeUser(instance: URL, user?: UserCredentials) {
  return updateHost(instance, (current) => ({ ...current, user }));
}

async function savePak(
  instance: URL,
  project: ApiKeyProject,
  pak: Token
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

export async function saveOAuthSession(instance: URL, session: OAuthSession) {
  return storeUser(instance, session);
}

export async function updateHostCredentials<T>(
  instance: URL,
  change: Change<T>
): Promise<T> {
  return store.update(instance.hostname, change);
}

export async function saveUserName(instance: URL, userName: string) {
  return updateHost(instance, (current) => {
    const user = usableSession(current, instance);
    if (!user) return current;
    return { ...current, user: { ...user, userName } };
  });
}

export type StoredCredentials =
  | { type: 'apiKey'; key: string }
  | { type: 'oauth'; session: OAuthSession };

export async function getStoredCredentials(
  apiUrl: URL,
  projectId: number
): Promise<StoredCredentials | null> {
  const host = await store.get(apiUrl.hostname);
  if (!host) {
    return null;
  }

  const user = host.user;
  if (user && isOAuthSession(user)) {
    return sessionOrProjectKey(apiUrl, host, user, projectId);
  }

  if (user) {
    if (user.expires !== 0 && Date.now() > user.expires) {
      warn(`Your personal access token for ${apiUrl.hostname} expired.`);
      await storeUser(apiUrl, undefined);
      return null;
    }

    return { type: 'apiKey', key: user.token };
  }

  return usableProjectKey(apiUrl, host, projectId);
}

/**
 * A session approved for one project cannot reach another one, but a key
 * stored for that other project can.
 */
async function sessionOrProjectKey(
  apiUrl: URL,
  host: HostCredentials,
  user: OAuthSession,
  projectId: number
): Promise<StoredCredentials | null> {
  const session = usableSession(host, apiUrl);
  if (!session) {
    warn(
      `The stored session for ${apiUrl.hostname} was issued by ${user.apiUrl}, not ${apiUrl.origin}.`
    );
    return usableProjectKey(apiUrl, host, projectId);
  }

  const approvedElsewhere =
    session.projectId !== undefined &&
    projectId > 0 &&
    session.projectId !== projectId;
  if (approvedElsewhere) {
    const key = await usableProjectKey(apiUrl, host, projectId);
    if (key) {
      return key;
    }
  }

  return { type: 'oauth', session };
}

/**
 * The session in this slot, if it is this instance's to use. Hosts key the
 * store, so the slot can hold one issued by another instance on the same
 * hostname, whose tokens must never go out to this one.
 */
export function usableSession(
  host: HostCredentials,
  apiUrl: URL
): OAuthSession | undefined {
  const user = host.user;
  if (!user || !isOAuthSession(user)) {
    return undefined;
  }
  return issuedBy(user, apiUrl) ? user : undefined;
}

export function issuedBy(session: OAuthSession, apiUrl: URL) {
  return tryParseUrl(session.apiUrl)?.origin === apiUrl.origin;
}

async function usableProjectKey(
  apiUrl: URL,
  host: HostCredentials,
  projectId: number
): Promise<{ type: 'apiKey'; key: string } | null> {
  if (projectId <= 0) {
    return null;
  }

  const pak = host.projects?.[projectId.toString(10)];
  if (!pak) {
    return null;
  }

  if (pak.expires !== 0 && Date.now() > pak.expires) {
    warn(
      `Your project API key for project #${projectId} on ${apiUrl.hostname} expired.`
    );
    await removeProjectKey(apiUrl, projectId);
    return null;
  }

  return { type: 'apiKey', key: pak.token };
}

export async function saveApiKey(instance: URL, token: ApiKeyInfo) {
  if (token.type === 'PAT') {
    return storeUser(instance, {
      token: token.key,
      expires: token.expires,
    });
  }

  return savePak(instance, token.project, {
    token: token.key,
    expires: token.expires,
  });
}

/** Whether there was a key to drop. */
export async function removeProjectKey(
  instance: URL,
  projectId: number
): Promise<boolean> {
  return store.update(instance.hostname, async (current) => {
    const id = projectId.toString(10);
    if (!current.projects?.[id]) {
      return { result: false };
    }

    const { [id]: _dropped, ...projects } = current.projects;
    const { [id]: _named, ...projectDetails } = current.projectDetails ?? {};
    return {
      next: { ...current, projects, projectDetails },
      result: true,
    };
  });
}

export async function removeApiKeys(api: URL) {
  return store.delete(api.hostname);
}

export async function clearAuthStore() {
  return store.clear();
}
