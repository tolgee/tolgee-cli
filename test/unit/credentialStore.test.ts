import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { readFile, readdir, rename, stat, writeFile } from 'fs/promises';

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

function renameRefusal(code: string) {
  return Object.assign(new Error(`rename ${code}`), { code });
}

type StoreModule = typeof import('#cli/config/credentialStore.js');
type CredentialsModule = typeof import('#cli/config/credentials.js');

// The store resolves its path when the module is first loaded, so the config
// directory has to be set before the import: the shared one the other suites
// use would race with them over authentication.json.
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

  it('says whether the host it was asked to delete was there', async () => {
    await fileCredentialStore.clear();
    await setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } });

    expect(await fileCredentialStore.delete('meow.local')).toBe(true);
    expect(await fileCredentialStore.delete('meow.local')).toBe(false);
    expect(await fileCredentialStore.delete('never.stored')).toBe(false);
  });

  it('says whether clearing had anything to clear', async () => {
    await fileCredentialStore.clear();
    await setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } });

    expect(await fileCredentialStore.clear()).toBe(true);
    expect(await fileCredentialStore.clear()).toBe(false);
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

  it('writes through a rename Windows refuses while a reader has the file', async () => {
    vi.mocked(rename).mockRejectedValueOnce(renameRefusal('EPERM'));

    await setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } });

    expect((await fileCredentialStore.list())['meow.local']).toBeDefined();
    expect(await readdir(CONFIG_DIR)).not.toContainEqual(
      expect.stringMatching(/\.tmp$/)
    );
  });

  it('gives up on a rename that keeps being refused, leaving no temp file', async () => {
    vi.mocked(rename).mockRejectedValue(renameRefusal('EBUSY'));
    try {
      await expect(
        setHost('meow.local', { user: { token: 'tgpat_meow', expires: 0 } })
      ).rejects.toMatchObject({ code: 'EBUSY' });
    } finally {
      vi.mocked(rename).mockReset();
      vi.mocked(rename).mockImplementation(
        (await vi.importActual<typeof import('fs/promises')>('fs/promises'))
          .rename
      );
    }

    expect(await readdir(CONFIG_DIR)).not.toContainEqual(
      expect.stringMatching(/\.tmp$/)
    );
  });

  // Windows has no POSIX file modes, so the mode the store asks for is lost.
  it.skipIf(process.platform === 'win32')(
    'keeps the store readable only by its owner',
    async () => {
      await setHost('meow.local', {
        user: { token: 'tgpat_meow', expires: 0 },
      });

      const mode = (await stat(AUTH_FILE)).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  );
});

describe('stored credentials', () => {
  it('uses a session bound to the project at hand, whatever else is stored', async () => {
    await fileCredentialStore.clear();
    await setHost('nya.local', {
      user: oauthSession({ projectId: 1 }),
      projects: { '1': { token: 'tgpak_project', expires: 0 } },
    });

    // Named, and not named: a bound session answers both, since it says which
    // project it reaches.
    expect(
      await getStoredCredentials(new URL('https://nya.local'), 1)
    ).toMatchObject({ type: 'oauth' });
    expect(
      await getStoredCredentials(new URL('https://nya.local'), -1)
    ).toMatchObject({ type: 'oauth' });
  });

  it('falls back to a key for a project the session is not bound to', async () => {
    await fileCredentialStore.clear();
    await setHost('nya.local', {
      user: oauthSession({ projectId: 1 }),
      projects: { '2': { token: 'tgpak_other', expires: 0 } },
    });

    expect(await getStoredCredentials(new URL('https://nya.local'), 2)).toEqual(
      {
        type: 'apiKey',
        key: 'tgpak_other',
      }
    );
  });

  it('uses a session approved for every project over a key stored for one', async () => {
    await fileCredentialStore.clear();
    await setHost('nya.local', {
      user: oauthSession(),
      projects: { '1': { token: 'tgpak_project', expires: 0 } },
    });

    expect(
      await getStoredCredentials(new URL('https://nya.local'), 1)
    ).toMatchObject({ type: 'oauth' });
  });

  it('keeps the session when no key covers the project it was not approved for', async () => {
    await fileCredentialStore.clear();
    await setHost('nya.local', { user: oauthSession({ projectId: 1 }) });

    expect(
      await getStoredCredentials(new URL('https://nya.local'), 2)
    ).toMatchObject({ type: 'oauth' });
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
