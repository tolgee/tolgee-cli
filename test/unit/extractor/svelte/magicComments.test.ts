import { extractTreeAndReport } from '#cli/extractor/extractor.js';
import { ExtractOptions } from '#cli/extractor/index.js';

const VERBOSE = false;

async function extractSvelteKeys(
  code: string,
  fileName: string,
  options?: Partial<ExtractOptions>
) {
  const { report } = await extractTreeAndReport(code, fileName, 'svelte', {
    strictNamespace: true,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });
  return report;
}

describe('magic comments', () => {
  describe('@tolgee-ignore', () => {
    it('ignores getTranslate', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-ignore
          const { t } = getTranslate()
        </script>
        {$t('uwu')}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([
        {
          line: 7,
          warning: 'W_MISSING_T_SOURCE',
        },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores t', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        <!-- @tolgee-ignore -->
        {$t('uwu')}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores <T>', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-ignore -->
        <T keyName='hello-world' />
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning upon unused marker', async () => {
      const expected = [
        { warning: 'W_UNUSED_IGNORE', line: 4 },
        { warning: 'W_UNUSED_IGNORE', line: 7 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-ignore
          console.log('hi cutie')
        </script>
        <!-- @tolgee-ignore -->
        <div>uwu</div>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses direct $t calls' warnings", async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        <!-- @tolgee-ignore -->
        {$t(\`dynamic-key-\${i}\`)}
        <!-- @tolgee-ignore -->
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        <!-- @tolgee-ignore -->
        {$t('key2', \`dynamic-\${i}\`)}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('only suppresses $t resolve failure', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 4 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <!-- @tolgee-ignore -->
        {$t('key1')}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses warnings of <T>', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-ignore -->
        <T keyName={\`dynamic-key-\${i}\`} />
        <!-- @tolgee-ignore -->
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <!-- @tolgee-ignore -->
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });
  });

  describe('@tolgee-key', () => {
    it('extracts keys specified as comments', async () => {
      const expected = [
        { keyName: 'key1', line: 4 },
        {
          keyName: 'key2',
          namespace: 'ns',
          defaultValue: 'test value',
          line: 5,
        },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-key key1
          // @tolgee-key { key: 'key2', ns: 'ns', defaultValue: 'test value' }
        </script>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual(expected);
    });

    it('overrides data from code', async () => {
      const expected = [
        { keyName: 'key-override-1', line: 6 },
        { keyName: 'key-override-2', namespace: undefined, line: 8 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('namespace')
        </script>
        <!-- @tolgee-key key-override-1 -->
        <T keyName='key-props-1' />
        <!-- @tolgee-key key-override-2 -->
        {$t('key-props-2')}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("doesn't extract json5 if escaped", async () => {
      const expected = [{ keyName: '{key}', line: 3 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-key \\{key} -->
        <T keyName='key-props-1' />
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("suppresses direct $t calls' warnings", async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        <!-- @tolgee-key override-1 -->
        {$t(\`dynamic-key-\${i}\`)}
        <!-- @tolgee-key override-2 -->
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        <!-- @tolgee-key override-3 -->
        {$t('key2', \`dynamic-\${i}\`)}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
    });

    it('only suppresses $t resolve failure', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 4 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <!-- @tolgee-key override-1 -->
        {$t('key1')}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
    });

    it('suppresses warnings of <T>', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-key override-1 -->
        <T keyName={\`dynamic-key-\${i}\`} />
        <!-- @tolgee-key override-2 -->
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <!-- @tolgee-key override-3 -->
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
    });

    it('emits warning when invalid json5 is used', async () => {
      const expected = [
        { warning: 'W_MALFORMED_KEY_OVERRIDE', line: 4 },
        { warning: 'W_INVALID_KEY_OVERRIDE', line: 5 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-key { key: 'key2'
          // @tolgee-key { ns: 'key2' }
        </script>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });
  });
});
