import { fileURLToPathSlash } from './utils/toFilePath.js';
import { run } from './utils/run.js';
import { join } from 'path';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const PROJECT = fileURLToPathSlash(new URL('./parserDetection', FIXTURES_PATH));

describe('parser detection from file extensions', () => {
  afterEach(async () => {
    await removeTmpFolder();
  });

  it('detects react', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.ts?(x)')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 10: hello-react');
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('detects svelte', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.{svelte,ts,js}')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
    expect(out.stdout).toContain('line 5: hello-svelte');
  });

  it('detects vue', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.{vue,ts,js}')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
    expect(out.stdout).toContain('line 6: hello-vue');
  });

  it('fails on unknown', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.{ts,js}')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(1);
    expect(out.stdout).toContain(
      "Couldn't detect which framework is used, use '--parser' or 'config.parser' option"
    );
  });

  it('passes unknown on supplied parser in options (args)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.{ts,js}')],
    });

    const out = await run([
      '--config',
      configFile,
      '--parser',
      'react',
      'extract',
      'print',
    ]);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('passes unknown on supplied parser in options (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      parser: 'react',
      patterns: [join(PROJECT, './code/*.{ts,js}')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('fails when multiple parsers are possible', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.{ts?(x),svelte,vue}')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(1);
    expect(out.stdout).toContain(
      "Detected multiple possible frameworks used (react, vue, svelte), use '--parser' or 'config.parser' options"
    );
  });

  it('passes multiple when parser supplied as option (args)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      patterns: [join(PROJECT, './code/*.{ts?(x),svelte,vue}')],
    });

    const out = await run([
      '--config',
      configFile,
      '--parser',
      'react',
      'extract',
      'print',
    ]);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 10: hello-react');
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('passes multiple when parser supplied as option (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      parser: 'react',
      patterns: [join(PROJECT, './code/*.{ts?(x),svelte,vue}')],
    });

    const out = await run(['--config', configFile, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 10: hello-react');
    expect(out.stdout).toContain('line 4: hello-unknown');
  });
});
