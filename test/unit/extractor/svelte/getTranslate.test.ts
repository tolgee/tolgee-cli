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

describe('getTranslate', () => {
  it('extracts from the t call with signature t(string))', async () => {
    const expected = [{ keyName: 'key1', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1')}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string)', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value', line: 6 },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1', 'default value')}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string, opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 6,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1', 'default value', { ns: 'ns', defaultValue: 'ignored' })}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 6,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1', 'default value', { ns: 'ns' })}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 6,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t({ key: 'key1', defaultValue: 'default value', ns: 'ns' })}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in getTranslate', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate('namespace')
      </script>
      {$t('key1')}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace if script is below template', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 2 }];

    const code = `
      {$t('key1')}
      <script lang="ts">
        import '@tolgee/svelte';
        const { t } = getTranslate('namespace')
      </script>
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in getTranslate (array)', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace1', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate([ 'namespace1', 'namespace2' ])
      </script>
      {$t('key1')}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('overrides the specified namespace if one is passed as parameter', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns1', line: 6 },
      { keyName: 'key2', namespace: '', line: 7 },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate('namespace')
      </script>
      {$t('key1', { ns: 'ns1' })}
      {$t('key2', { ns: '' })}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('warning if there was no getTranslate call', async () => {
    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        // Do something...
      </script>
      {$t('key1')}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([
      { line: 6, warning: 'W_MISSING_T_SOURCE' },
    ]);
    expect(extracted.keys).toEqual([]);
  });

  it('handles multi-line use', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 9 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate(
          'namespace'
        )
      </script>
      {
        $t(
          'key1'
        )
      }
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles weird spacings', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate         (   'namespace')
      </script>
      {$t     (      'key1')}
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 6 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
        { warning: 'W_DYNAMIC_KEY', line: 8 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('namespace')
        </script>
        {$t(\`dynamic-key-\${i}\`)}
        {$t('dynamic-key-' + i)}
        {$t(key)}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace (within t) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 9 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('namespace')
        </script>
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        {$t('key2', { ns: 'dynamic-ns-' + i })}
        {$t('key2', { ns: ns })}
        {$t('key2', { ns })}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warnings on dynamic namespace (within getTranslate) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 6 },
      ];

      const templateCode = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        {$t('key1')}
      `;
      const concatCode = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('dynamic-ns-' + i)
        </script>
        {$t('key1')}
      `;
      const variableCode = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(ns)
        </script>
        {$t('key1')}
      `;

      const extracted1 = await extractSvelteKeys(templateCode, 'App.svelte');
      const extracted2 = await extractSvelteKeys(concatCode, 'App.svelte');
      const extracted3 = await extractSvelteKeys(variableCode, 'App.svelte');
      expect(extracted1.warnings).toEqual(expected);
      expect(extracted1.keys).toEqual([]);
      expect(extracted2.warnings).toEqual(expected);
      expect(extracted2.keys).toEqual([]);
      expect(extracted3.warnings).toEqual(expected);
      expect(extracted3.keys).toEqual([]);
    });

    it('extracts if getTranslate is dynamic but a static override is specified', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 6 },
      ];

      const expectedKeys = [
        { keyName: 'key2', namespace: 'static-ns', line: 7 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(ns)
        </script>
        {$t('key1')}
        {$t('key2', { ns: 'static-ns' })}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });

    it('emits warning for dynamic parameters', async () => {
      const expectedWarnings = [{ warning: 'W_DYNAMIC_OPTIONS', line: 6 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        {$t('key1', someValue)}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning for dynamic default values, but extracts keys', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 7 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined, line: 6 },
        { keyName: 'key2', defaultValue: undefined, line: 7 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        {$t('key1', 'dynamic-' + i, {})}
        {$t('key2', \`dynamic-\${i}\`, {})}
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });

  describe('global tolgee.t function', () => {
    it('detects global tolgee.t function', async () => {
      const code = `
        <script>
          const tolgee = Tolgee()
          tolgee.t('key_name')
        </script>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual([{ keyName: 'key_name', line: 4 }]);
      expect(extracted.warnings).toEqual([]);
    });
  });
});
