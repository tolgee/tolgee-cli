import { fileURLToPath } from 'url';
import { MockInstance, vi } from 'vitest';

import { glob } from 'tinyglobby';
import loadTolgeeRc from '#cli/config/tolgeerc.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

describe('.tolgeerc', () => {
  let cwd: MockInstance;

  beforeAll(() => {
    cwd = vi.spyOn(process, 'cwd');
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
      pull: {
        delimiter: null,
      },
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
      pull: {
        delimiter: null,
      },
    });
  });

  it('resolves relative paths', async () => {
    const path = fileURLToPath(
      new URL('./validTolgeeRc/withPaths.json', FIXTURES_PATH)
    );

    const cfg = (await loadTolgeeRc(path))!;

    // make sure all paths in the config file are expanded relatively to the config location
    for (const path of [
      cfg.extractor,
      ...cfg.patterns!,
      ...cfg.push!.files!.map((f) => f.path),
    ]) {
      expect(path).toMatch(/[^/\\][/\\]validTolgeeRc[/\\][^/\\]/);
      expect(await glob(path!)).length.above(0);
    }
  });

  it('converts projectId to number', async () => {
    const path = fileURLToPath(
      new URL('./validTolgeeRc/withProjectIdString.json', FIXTURES_PATH)
    );

    const cfg = (await loadTolgeeRc(path))!;

    expect(cfg.projectId).toBe(1337);
  });

  it('loads config with branch', async () => {
    const path = fileURLToPath(
      new URL('./validTolgeeRc/withBranch.json', FIXTURES_PATH)
    );

    const cfg = await loadTolgeeRc(path);

    expect(cfg?.branch).toBe('config-branch');
  });

  it('loads and normalizes custom headers', async () => {
    const testWd = fileURLToPath(
      new URL('./validTolgeeRcHeaders', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    const cfg = await loadTolgeeRc();
    expect(cfg?.headers).toEqual({ 'x-custom': 'bar', 'x-padded': 'v' });
  });

  it('accepts an empty headers object', async () => {
    const testWd = fileURLToPath(
      new URL('./validTolgeeRcHeadersEmpty', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    const cfg = await loadTolgeeRc();
    expect(cfg?.headers).toEqual({});
  });

  it('rejects an invalid header name', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcHeaderName', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    return expect(loadTolgeeRc()).rejects.toThrow(/invalid header name/);
  });

  it('rejects a header value with control characters', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcHeaderValue', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    return expect(loadTolgeeRc()).rejects.toThrow(/control characters/);
  });

  it('rejects headers that collide only by case', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcHeaderDuplicate', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    return expect(loadTolgeeRc()).rejects.toThrow(/duplicate header/);
  });

  it('defers a non-string header value to schema validation', async () => {
    const testWd = fileURLToPath(
      new URL('./invalidTolgeeRcHeaderType', FIXTURES_PATH)
    );
    cwd.mockReturnValue(testWd);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as any);

    await expect(loadTolgeeRc()).rejects.toThrow('process.exit');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Tolgee config:/)
    );

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
