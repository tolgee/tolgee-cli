import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

import { join } from 'path';
import { rm, readFile } from 'fs/promises';
import { saveApiKey, getApiKey } from '../../src/config/credentials.js';
import loadTolgeeRc from '../../src/config/tolgeerc.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const AUTH_FILE = join(tmpdir(), 'authentication.json');
const TG_1 = new URL('https://app.tolgee.io');
const TG_2 = new URL('https://meow.local');
const TG_3 = new URL('https://nya.local');
const PAT_1 = <const>{
  type: 'PAT',
  key: 'tgpat_xxxxxxxxxx',
  username: 'sleepycat',
  expires: 0,
};
const PAT_2 = <const>{
  type: 'PAT',
  key: 'tgpat_yyyyyyyyyy',
  username: 'sleepycat',
  expires: 0,
};
const PAT_3 = <const>{
  type: 'PAT',
  key: 'tgpat_zzzzzzzzzz',
  username: 'sleepycat',
  expires: 0,
};
const PAT_4 = <const>{
  type: 'PAT',
  key: 'tgpat_expired',
  username: 'sleepycat',
  expires: 2,
};
const PAK_1 = <const>{
  type: 'PAK',
  key: 'tgpak_gfpw2zlpo4qhk53v',
  username: 'sleepycat',
  project: { id: 1, name: 'project 1' },
  expires: 0,
};
const PAK_2 = <const>{
  type: 'PAK',
  key: 'tgpak_gjpw2zlpo4qhk53v',
  username: 'sleepycat',
  project: { id: 2, name: 'project 2' },
  expires: 0,
};
const PAK_3 = <const>{
  type: 'PAK',
  key: 'tgpak_gfpwo4tsojzhe4ts',
  username: 'sleepycat',
  project: { id: 1, name: 'project 1' },
  expires: 0,
};

describe('credentials', () => {
  describe('store', () => {
    afterEach(async () => {
      await rm(AUTH_FILE);
    });

    it('stores tokens in the authentication.json file', async () => {
      await saveApiKey(TG_1, PAT_1);

      const saved = await readFile(AUTH_FILE, 'utf8');
      expect(saved).toContain(TG_1.hostname);
      expect(saved).toContain(PAT_1.key);
    });

    it('stores can store different tokens for different instances', async () => {
      await saveApiKey(TG_1, PAT_1);
      await saveApiKey(TG_2, PAT_2);
      const saved1 = await readFile(AUTH_FILE, 'utf8');
      expect(saved1).toContain(TG_1.hostname);
      expect(saved1).toContain(TG_2.hostname);
      expect(saved1).toContain(PAT_1.key);
      expect(saved1).toContain(PAT_2.key);

      await saveApiKey(TG_1, PAT_3);
      const saved2 = await readFile(AUTH_FILE, 'utf8');
      expect(saved2).not.toContain(PAT_1.key);
      expect(saved2).toContain(PAT_2.key);
      expect(saved2).toContain(PAT_3.key);
    });

    it('can store multiple project keys for the same instance', async () => {
      await saveApiKey(TG_1, PAK_1);
      await saveApiKey(TG_1, PAK_2);
      const saved1 = await readFile(AUTH_FILE, 'utf8');
      expect(saved1).toContain(TG_1.hostname);
      expect(saved1).toContain(PAK_1.key);
      expect(saved1).toContain(PAK_2.key);

      await saveApiKey(TG_1, PAK_3);
      const saved2 = await readFile(AUTH_FILE, 'utf8');
      expect(saved2).not.toContain(PAK_1.key);
      expect(saved2).toContain(PAK_2.key);
      expect(saved2).toContain(PAK_3.key);
    });
  });

  describe('load', () => {
    beforeAll(async () => {
      await saveApiKey(TG_1, PAK_1);
      await saveApiKey(TG_1, PAK_2);

      await saveApiKey(TG_2, PAT_1);
      await saveApiKey(TG_1, PAK_1);

      await saveApiKey(TG_3, PAT_4);
    });

    it('loads the correct token based on instance and project', async () => {
      const key1 = await getApiKey(TG_1, 1);
      const key2 = await getApiKey(TG_1, 2);
      const key3 = await getApiKey(TG_1, 3);
      const key4 = await getApiKey(TG_1, -1);
      const key5 = await getApiKey(TG_2, -1);

      expect(key1).toBe(PAK_1.key);
      expect(key2).toBe(PAK_2.key);
      expect(key3).toBeNull();
      expect(key4).toBeNull();
      expect(key5).toBe(PAT_1.key);
    });

    it('prioritizes personal access tokens over project api keys', async () => {
      const key = await getApiKey(TG_2, 1);
      expect(key).toBe(PAT_1.key);
    });

    it('does not load expired keys', async () => {
      const saved1 = await readFile(AUTH_FILE, 'utf8');
      expect(saved1).toContain(PAT_4.key);

      const key = await getApiKey(TG_3, -1);
      expect(key).toBeNull();

      // Check it pruned it from store
      const saved2 = await readFile(AUTH_FILE, 'utf8');
      expect(saved2).not.toContain(PAT_4.key);
    });
  });
});

describe('.tolgeerc', () => {
  let cwd: jest.SpiedFunction<typeof process.cwd>;

  beforeAll(() => {
    cwd = jest.spyOn(process, 'cwd');
  });

  it('loads nothing', async () => {
    const testWd = fileURLToPath(new URL('./emptyFolder', FIXTURES_PATH));
    cwd.mockReturnValue(testWd);

    const cfg = await loadTolgeeRc();
    expect(cfg).toBeNull();
  });

  it('loads valid tolgeerc', async () => {
    const testWd = fileURLToPath(new URL('./validTolgeeRc', FIXTURES_PATH));
    cwd.mockReturnValue(testWd);

    const cfg = await loadTolgeeRc();
    expect(cfg).toEqual({
      apiUrl: new URL('https://app.tolgee.io'),
      projectId: 1337,
      sdk: 'react',
    });
  });

  it('rejects invalid API url', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcApi', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    return expect(loadTolgeeRc()).rejects.toThrow('apiUrl');
  });

  it('rejects invalid project ID', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcProject', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);
    return expect(loadTolgeeRc()).rejects.toThrow('projectId');
  });

  it('rejects invalid SDK', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcSdk', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);
    return expect(loadTolgeeRc()).rejects.toThrow('sdk');
  });
});
