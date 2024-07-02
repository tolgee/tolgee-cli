import { fileURLToPathSlash } from './utils/toFilePath.js';
import { run } from './utils/run.js';
import { join } from 'path';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const PROJECT = fileURLToPathSlash(new URL('./parserDetection', FIXTURES_PATH));

const CONFIG_REACT = join(PROJECT, 'config.react.json');
const CONFIG_SVELTE = join(PROJECT, 'config.svelte.json');
const CONFIG_VUE = join(PROJECT, 'config.vue.json');
const CONFIG_UNKNOWN = join(PROJECT, 'config.unknown.json');
const CONFIG_PARSER = join(PROJECT, 'config.parser.json');
const CONFIG_MIXED = join(PROJECT, 'config.mixed.json');

describe('parser detection from file extensions', () => {
  it('detects react', async () => {
    const out = await run(['--config', CONFIG_REACT, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 10: hello-react');
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('detects svelte', async () => {
    const out = await run(['--config', CONFIG_SVELTE, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
    expect(out.stdout).toContain('line 5: hello-svelte');
  });

  it('detects vue', async () => {
    const out = await run(['--config', CONFIG_VUE, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
    expect(out.stdout).toContain('line 6: hello-vue');
  });

  it('fails on unknown', async () => {
    const out = await run(['--config', CONFIG_UNKNOWN, 'extract', 'print']);
    expect(out.code).toBe(1);
    expect(out.stdout).toContain(
      "Couldn't detect which framework is used, use '--parser' or 'config.parser' option"
    );
  });

  it('passes unknown on supplied parser in options', async () => {
    const out = await run([
      '--config',
      CONFIG_UNKNOWN,
      '--parser',
      'react',
      'extract',
      'print',
    ]);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('passes when parser specified in config', async () => {
    const out = await run(['--config', CONFIG_PARSER, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 4: hello-unknown');
  });

  it('fails when multiple parsers are possible', async () => {
    const out = await run(['--config', CONFIG_MIXED, 'extract', 'print']);
    expect(out.code).toBe(1);
    expect(out.stdout).toContain(
      "Detected multiple possible frameworks used (react, vue, svelte), use '--parser' or 'config.parser' options"
    );
  });

  it('passes multiple when parser supplied as option', async () => {
    const out = await run([
      '--config',
      CONFIG_MIXED,
      '--parser',
      'react',
      'extract',
      'print',
    ]);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain('line 10: hello-react');
    expect(out.stdout).toContain('line 4: hello-unknown');
  });
});
