import { fileURLToPathSlash } from './utils/toFilePath.js';
import { run } from './utils/run.js';
import { join } from 'path';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const PROJECT = fileURLToPathSlash(new URL('./parserOptions', FIXTURES_PATH));

const PATTERNS = {
  react: './code/*.tsx',
  svelte: './code/*.svelte',
  vue: './code/*.vue',
};

function lns(input: string) {
  return input
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

describe.each(['react', 'svelte', 'vue'] as const)(
  'extractor options',
  (parser) => {
    afterEach(async () => {
      await removeTmpFolder();
    });

    it('gives warning when strict', async () => {
      const { configFile } = await createTmpFolderWithConfig({
        patterns: [join(PROJECT, PATTERNS[parser])],
      });
      const out = await run(['--config', configFile, 'extract', 'print']);
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
      const { configFile } = await createTmpFolderWithConfig({
        patterns: [join(PROJECT, PATTERNS[parser])],
      });
      const out = await run([
        '--config',
        configFile,
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
      const { configFile } = await createTmpFolderWithConfig({
        patterns: [join(PROJECT, PATTERNS[parser])],
        strictNamespace: false,
      });

      const out = await run(['--config', configFile, 'extract', 'print']);
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
      const { configFile } = await createTmpFolderWithConfig({
        patterns: [join(PROJECT, PATTERNS[parser])],
      });

      const out = await run([
        '--config',
        configFile,
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
      const { configFile } = await createTmpFolderWithConfig({
        patterns: [join(PROJECT, PATTERNS[parser])],
        strictNamespace: false,
        defaultNamespace: 'default',
      });

      const out = await run(['--config', configFile, 'extract', 'print']);
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
  }
);
