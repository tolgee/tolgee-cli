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
let getApiKey: CredentialsModule['getApiKey'];

beforeAll(async () => {
  ({ fileCredentialStore, isOAuthSession } = await import(
    '#cli/config/credentialStore.js'
  ));
  ({ getApiKey } = await import('#cli/config/credentials.js'));
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

    expect(await getApiKey('https://app.tolgee.io', 1)).toBe('tgpat_legacy');
    expect(await fileCredentialStore.get('app.tolgee.io')).toEqual(
      LEGACY_STORE['app.tolgee.io']
    );
  });

  it('leaves an existing host untouched when another one is written', async () => {
    await writeLegacyStore();

    await fileCredentialStore.set('meow.local', {
      user: { token: 'tgpat_meow', expires: 0 },
    });

    const saved = JSON.parse(await readFile(AUTH_FILE, 'utf8'));
    expect(saved['app.tolgee.io']).toEqual(LEGACY_STORE['app.tolgee.io']);
    expect(saved['meow.local'].user.token).toBe('tgpat_meow');
  });

  it('round-trips an OAuth session', async () => {
    await writeLegacyStore();

    await fileCredentialStore.set('nya.local', {
      user: {
        type: 'oauth',
        accessToken: 'tgoat_xxx',
        accessExpires: 1234,
        refreshToken: 'tgort_yyy',
        userName: 'sleepycat',
      },
    });

    const user = (await fileCredentialStore.get('nya.local'))!.user!;
    expect(isOAuthSession(user)).toBe(true);
    expect(user).toEqual({
      type: 'oauth',
      accessToken: 'tgoat_xxx',
      accessExpires: 1234,
      refreshToken: 'tgort_yyy',
      userName: 'sleepycat',
    });
  });

  it('never offers an OAuth session as an api key', async () => {
    await fileCredentialStore.clear();
    await fileCredentialStore.set('nya.local', {
      user: {
        type: 'oauth',
        accessToken: 'tgoat_xxx',
        accessExpires: 1234,
        refreshToken: 'tgort_yyy',
      },
    });

    expect(await getApiKey('https://nya.local', 1)).toBeNull();
  });

  it('deletes one host without disturbing the others', async () => {
    await writeLegacyStore();
    await fileCredentialStore.set('meow.local', {
      user: { token: 'tgpat_meow', expires: 0 },
    });

    await fileCredentialStore.delete('meow.local');

    expect(await fileCredentialStore.get('meow.local')).toBeUndefined();
    expect(await fileCredentialStore.get('app.tolgee.io')).toEqual(
      LEGACY_STORE['app.tolgee.io']
    );
  });

  it('keeps the store readable only by its owner', async () => {
    await fileCredentialStore.set('meow.local', {
      user: { token: 'tgpat_meow', expires: 0 },
    });

    const mode = (await stat(AUTH_FILE)).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
