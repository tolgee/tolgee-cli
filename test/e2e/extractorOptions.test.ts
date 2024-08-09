import { fileURLToPathSlash } from './utils/toFilePath.js';
import { run } from './utils/run.js';
import { join } from 'path';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const PROJECT = fileURLToPathSlash(new URL('./parserOptions', FIXTURES_PATH));

function lns(input: string) {
  return input
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

describe.each(['react', 'svelte', 'vue'])('extractor options', (parser) => {
  it('gives warning when strict', async () => {
    const config = join(PROJECT, `config.${parser}.json`);
    const out = await run(['--config', config, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(lns(out.stdout)).toContain(
      lns(`
        line 4: Expected source of \`t\` function (useTranslate or getTranslate)`)
    );
    expect(lns(out.stdout)).toContain(
      lns(`
        line 5: key2
                namespace: custom`)
    );
    expect(lns(out.stdout)).toContain(
      lns(`
        line 9: key3
                namespace: namespace`)
    );
  });

  it('no warning when not strict', async () => {
    const config = join(PROJECT, `config.${parser}.json`);
    const out = await run([
      '--config',
      config,
      '--no-strict-namespace',
      'extract',
      'print',
    ]);
    expect(out.code).toBe(0);
    expect(lns(out.stdout)).toContain(
      lns(`
        line 4: key1
        line 5: key2
          namespace: custom
        line 9: key3
          namespace: namespace`)
    );
  });

  it('no warning when not strict (config)', async () => {
    const config = join(PROJECT, `config.${parser}.noStrict.json`);

    const out = await run(['--config', config, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(lns(out.stdout)).toContain(
      lns(`
        line 4: key1
        line 5: key2
          namespace: custom
        line 9: key3
          namespace: namespace`)
    );
  });

  it('default namespace used', async () => {
    const config = join(PROJECT, `config.${parser}.json`);

    const out = await run([
      '--config',
      config,
      '--no-strict-namespace',
      '--default-namespace',
      'default',
      'extract',
      'print',
    ]);
    expect(out.code).toBe(0);
    expect(lns(out.stdout)).toContain(
      lns(`
        line 4: key1
          namespace: default
        line 5: key2
          namespace: custom
        line 9: key3
          namespace: namespace`)
    );
  });

  it('default namespace used (config)', async () => {
    const config = join(PROJECT, `config.${parser}.default.json`);

    const out = await run(['--config', config, 'extract', 'print']);
    expect(out.code).toBe(0);
    expect(lns(out.stdout)).toContain(
      lns(`
        line 4: key1
          namespace: default
        line 5: key2
          namespace: custom
        line 9: key3
          namespace: namespace`)
    );
  });
});
