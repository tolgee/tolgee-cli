import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { readFile, stat, writeFile } from 'fs/promises';

type StoreModule = typeof import('#cli/config/credentialStore.js');
type CredentialsModule = typeof import('#cli/config/credentials.js');

// The store resolves its path when the module is first loaded, so the config directory has to be set before the
// import: the shared one the other suites use would race with them over authentication.json.
const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'tolgee-cli-store-'));
process.env.TOLGEE_CLI_CONFIG_PATH = CONFIG_DIR;

const AUTH_FILE = join(CONFIG_DIR, 'authentication.json');

let fileCredentialStore: StoreModule['fileCredentialStore'];
let isOAuthSession: StoreModule['isOAuthSession'];
let getStoredCredentials: CredentialsModule['getStoredCredentials'];

function oauthSession(overrides: Record<string, unknown> = {}) {
  return {
    type: 'oauth',
    accessToken: 'tgoat_xxx',
    accessExpires: 1234,
    refreshToken: 'tgort_yyy',
    scopes: [] as string[],
    apiUrl: 'https://nya.local',
    ...overrides,
  };
}

async function setHost(host: string, credentials: any) {
  await fileCredentialStore.update(host, async () => ({
    next: credentials,
    result: undefined,
  }));
}

async function apiKeyFor(url: string, projectId: number) {
  const stored = await getStoredCredentials(new URL(url), projectId);
  return stored?.type === 'apiKey' ? stored.key : null;
}

beforeAll(async () => {
  ({ fileCredentialStore, isOAuthSession } = await import(
    '#cli/config/credentialStore.js'
  ));
  ({ getStoredCredentials } = await import('#cli/config/credentials.js'));
});

const LEGACY_STORE = {
  'app.tolgee.io': {
    user: { token: 'tgpat_legacy', expires: 0 },
    projects: { '1': { token: 'tgpak_legacy', expires: 0 } },
    projectDetails: { '1': { name: 'project 1' } },
  },
};

async function writeLegacyStore() {
  await writeFile(AUTH_FILE, JSON.stringify(LEGACY_STORE), {
    mode: 0o600,
    encoding: 'utf8',
  });
}

describe('credential store', () => {
  it('reads a store written before browser login existed', async () => {
    await writeLegacyStore();

    expect(await apiKeyFor('https://app.tolgee.io', 1)).toBe('tgpat_legacy');
    expect(await fileCredentialStore.get('app.tolgee.io')).toEqual(
      LEGACY_STORE['app.tolgee.io']
    );
  });

  it('leaves an existing host untouched when another one is written', async () => {
    await writeLegacyStore();

    await setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } });

    const saved = JSON.parse(await readFile(AUTH_FILE, 'utf8'));
    expect(saved['app.tolgee.io']).toEqual(LEGACY_STORE['app.tolgee.io']);
    expect(saved['meow.local'].user.token).toBe('tgpat_meow');
  });

  it('round-trips an OAuth session', async () => {
    await writeLegacyStore();

    await setHost('nya.local', {
      user: oauthSession({
        scopes: ['translations.edit'],
        userName: 'sleepycat',
      }),
    });

    const user = (await fileCredentialStore.get('nya.local'))!.user!;
    expect(isOAuthSession(user)).toBe(true);
    expect(user).toEqual(
      oauthSession({ scopes: ['translations.edit'], userName: 'sleepycat' })
    );
  });

  it('never offers an OAuth session as an api key', async () => {
    await fileCredentialStore.clear();
    await setHost('nya.local', {
      user: oauthSession(),
    });

    expect(await apiKeyFor('https://nya.local', 1)).toBeNull();
  });

  it('deletes one host without disturbing the others', async () => {
    await writeLegacyStore();
    await setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } });

    await fileCredentialStore.delete('meow.local');

    expect(await fileCredentialStore.get('meow.local')).toBeUndefined();
    expect(await fileCredentialStore.get('app.tolgee.io')).toEqual(
      LEGACY_STORE['app.tolgee.io']
    );
  });

  it('does not create a host record for a change that stores nothing', async () => {
    await fileCredentialStore.clear();

    await fileCredentialStore.update('typo.local', async (current) => ({
      next: current,
      result: undefined,
    }));

    expect(await fileCredentialStore.list()).toEqual({});
  });

  it('forgets a host once its last credential is removed', async () => {
    await fileCredentialStore.clear();
    await setHost('meow.local', {
      projects: { '1': { token: 'tgpak_meow', expires: 0 } },
    });

    await fileCredentialStore.update('meow.local', async (current) => {
      delete current.projects?.['1'];
      return { next: current, result: undefined };
    });

    expect(await fileCredentialStore.list()).toEqual({});
  });

  it('keeps the store readable only by its owner', async () => {
    await setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } });

    const mode = (await stat(AUTH_FILE)).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe('stored credentials', () => {
  it('prefers a key issued for the project over a browser session', async () => {
    await fileCredentialStore.clear();
    await setHost('nya.local', {
      user: oauthSession(),
      projects: { '1': { token: 'tgpak_project', expires: 0 } },
    });

    expect(await getStoredCredentials(new URL('https://nya.local'), 1)).toEqual(
      {
        type: 'apiKey',
        key: 'tgpak_project',
      }
    );

    expect(
      await getStoredCredentials(new URL('https://nya.local'), 2)
    ).toMatchObject({
      type: 'oauth',
    });
  });

  it('never hands a session to an instance that did not issue it', async () => {
    await fileCredentialStore.clear();
    await setHost('localhost', {
      user: oauthSession({
        accessExpires: Date.now() + 60_000,
        apiUrl: 'http://localhost:22222/',
      }),
      projects: { '1': { token: 'tgpak_for_one', expires: 0 } },
    });

    expect(
      await getStoredCredentials(new URL('http://localhost:8080'), -1)
    ).toBeNull();
    expect(
      await getStoredCredentials(new URL('http://localhost:8080'), 1)
    ).toEqual({
      type: 'apiKey',
      key: 'tgpak_for_one',
    });
    expect(
      await getStoredCredentials(new URL('http://localhost:22222'), -1)
    ).toMatchObject({ type: 'oauth' });
  });

  it('reports a personal access token as an api key', async () => {
    await writeLegacyStore();

    expect(
      await getStoredCredentials(new URL('https://app.tolgee.io'), 1)
    ).toEqual({
      type: 'apiKey',
      key: 'tgpat_legacy',
    });
  });
});
