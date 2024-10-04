import { extractTreeAndReport } from '#cli/extractor/extractor.js';
import { ExtractOptions } from '#cli/extractor/index.js';

const VERBOSE = false;

async function extractReactKeys(
  code: string,
  fileName: string,
  options?: Partial<ExtractOptions>
) {
  const { report } = await extractTreeAndReport(code, fileName, 'react', {
    strictNamespace: true,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });
  return report;
}

describe.each(['js', 'ts', 'jsx', 'tsx'])('useTranslate (.%s)', (ext) => {
  const FILE_NAME = `test.${ext}`;

  it('extracts from the t call with signature t(string))', async () => {
    const expected = [{ keyName: 'key1', line: 5 }];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate()
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string)', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value', line: 5 },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate()
        t('key1', 'default value')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string, opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 5,
      },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate()
        t('key1', 'default value', { ns: 'ns', defaultValue: 'ignored' })
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        namespace: 'ns',
        line: 5,
      },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate()
        t('key1', { ns: 'ns' })
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 5,
      },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate()
        t({ key: 'key1', defaultValue: 'default value', ns: 'ns' })
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles nested t calls', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'namespace', line: 5 },
      { keyName: 'key2', namespace: 'namespace', line: 5 },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1', { param: t('key2') })
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in useTranslate', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 5 }];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in useTranslate (array)', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace1', line: 5 }];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate([ 'namespace1', 'namespace2' ])
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('overrides the specified namespace if one is passed as parameter', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns1', line: 5 },
      { keyName: 'key2', namespace: '', line: 6 },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1', { ns: 'ns1' })
        t('key2', { ns: '' })
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('uses default namespace if not specified', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns1', line: 5 },
      { keyName: 'key2', namespace: '', line: 6 },
      { keyName: 'key3', namespace: 'test', line: 7 },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate()
        t('key1', { ns: 'ns1' })
        t('key2', { ns: '' })
        t('key3')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME, {
      defaultNamespace: 'test',
    });
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('warns when no useTranslate', async () => {
    const code = `
      import '@tolgee/react'
      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([
      { line: 4, warning: 'W_MISSING_T_SOURCE' },
    ]);
    expect(extracted.keys).toEqual([]);
  });

  it('passes when no useTranslate and strictNamespace', async () => {
    const code = `
      import '@tolgee/react'
      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME, {
      strictNamespace: false,
    });
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 4 }]);
  });

  it('assigns default ns when no useTranslate and strictNamespace', async () => {
    const code = `
      import '@tolgee/react'
      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME, {
      strictNamespace: false,
      defaultNamespace: 'test',
    });
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 4, namespace: 'test' },
    ]);
  });

  it('warns when useTranslate is in different block', async () => {
    const code = `
      import '@tolgee/react'
      function Meow () {
        const { t } = useTranslate()
      }

      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([
      { line: 8, warning: 'W_MISSING_T_SOURCE' },
    ]);
    expect(extracted.keys).toEqual([]);
  });

  it('warns if the useTranslate call was in a deeper block', async () => {
    const code = `
      import '@tolgee/react'
      function Test () {
        function Meow () {
          const { t } = useTranslate()
        }
        t('key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([
      { line: 7, warning: 'W_MISSING_T_SOURCE' },
    ]);
    expect(extracted.keys).toEqual([]);
  });

  it('keeps track of the right namespace when multiple useTranslates are in use', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns-test', line: 5 },
      { keyName: 'key2', namespace: 'ns-meow', line: 9 },
      { keyName: 'key3', namespace: 'ns-test', line: 12 },
    ];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate('ns-test')
        t('key1')

        function Meow () {
          const { t } = useTranslate('ns-meow')
          t('key2')
        }

        t('key3')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles multi-line use', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 8 }];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate(
          'namespace'
        )

        t(
          'key1'
        )
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles weird spacings', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 5 }];

    const code = `
      import '@tolgee/react'
      function Test () {
        const { t } = useTranslate         (   'namespace')
        t     (      'key1')
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 5 },
        { warning: 'W_DYNAMIC_KEY', line: 6 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
      ];

      const code = `
        import '@tolgee/react'
        function Test () {
          const { t } = useTranslate('namespace')
          t(\`dynamic-key-\${i}\`)
          t('dynamic-key-' + i)
          t(key)
        }
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace (within t) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
      ];

      const code = `
        import '@tolgee/react'
        function Test () {
          const { t } = useTranslate('namespace')
          t('key1', { ns: \`dynamic-ns-\${i}\` })
          t('key2', { ns: 'dynamic-ns-' + i })
          t('key2', { ns: ns })
          t('key2', { ns })
        }
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warnings on dynamic namespace (within useTranslate) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 5 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 9 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 10 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 14 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 15 },
      ];

      const code = `
        import '@tolgee/react'
        function Test1 () {
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
          t('key2')
        }

        function Test2 () {
          const { t } = useTranslate('dynamic-ns-' + i)
          t('key3')
        }

        function Test3 () {
          const { t } = useTranslate(ns)
          t('key1')
        }
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('extracts if useTranslate is dynamic but a static override is specified', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 5 },
      ];

      const expectedKeys = [
        { keyName: 'key2', namespace: 'static-ns', line: 6 },
      ];

      const code = `
        import '@tolgee/react'
        function Test3 () {
          const { t } = useTranslate(ns)
          t('key1')
          t('key2', { ns: 'static-ns' })
        }
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });

    it('handles t function with function definition in options', async () => {
      const code = `
      import '@tolgee/react'
      const { t } = useTranslate('global')

      t('keyName1', {
        async someParameter() {
          return 'hello'
        },
        ns: 'local'
      })
    `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([
        {
          defaultValue: undefined,
          keyName: 'keyName1',
          line: 5,
          namespace: 'local',
        },
      ]);
    });

    it('emits warning for dynamic default values, but extracts keys', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 5 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined, line: 5 },
        { keyName: 'key2', defaultValue: undefined, line: 6 },
      ];

      const code = `
        import '@tolgee/react'
        function Test3 () {
          const { t } = useTranslate()
          t('key1', 'dynamic-' + i, {})
          t('key2', \`dynamic-\${i}\`, {})
        }
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});
