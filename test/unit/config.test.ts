import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';

import loadTolgeeRc from '../../src/config/tolgeerc.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

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
      apiUrl: 'https://app.tolgee.io',
      projectId: 1337,
      delimiter: '',
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

  it('loads config with provided path', async () => {
    const path = fileURLToPath(
      new URL('./validTolgeeRc/.tolgeerc', FIXTURES_PATH)
    );
    const cfg = await loadTolgeeRc(path);
    expect(cfg).toEqual({
      apiUrl: 'https://app.tolgee.io',
      projectId: 1337,
      delimiter: '',
    });
  });

  it('resolves relative paths', async () => {
    const path = fileURLToPath(
      new URL('./validTolgeeRc/withPaths.json', FIXTURES_PATH)
    );

    const cfg = (await loadTolgeeRc(path))!;

    console.log(JSON.stringify(cfg, null, 2));

    // make sure all paths in the config file are expanded relatively to the config location
    [
      cfg.extractor,
      ...cfg.patterns!,
      ...cfg.push!.files!.map((f) => f.path),
    ].forEach((path) => {
      expect(path).toContain('/validTolgeeRc/');
    });
  });
});
