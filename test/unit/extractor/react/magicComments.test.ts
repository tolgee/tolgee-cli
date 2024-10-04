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

describe('magic comments', () => {
  describe('@tolgee-ignore', () => {
    it.each(['js', 'ts', 'jsx', 'tsx'])(
      'ignores React.createElement (.%s)',
      async (ext) => {
        const code = `
          import '@tolgee/react'
          // @tolgee-ignore
          React.createElement(T, { keyName: 'uwu' })
        `;

        const extracted = await extractReactKeys(code, `test.${ext}`);
        expect(extracted.warnings).toEqual([]);
        expect(extracted.keys).toEqual([]);
      }
    );

    it.each(['js', 'ts', 'jsx', 'tsx'])(
      'ignores useTranslate (.%s)',
      async (ext) => {
        const code = `
          import '@tolgee/react'
          function Test () {
            // @tolgee-ignore
            const { t } = useTranslate()

            t('uwu')
          }
        `;

        const extracted = await extractReactKeys(code, `test.${ext}`);
        expect(extracted.warnings).toEqual([
          {
            line: 7,
            warning: 'W_MISSING_T_SOURCE',
          },
        ]);
        expect(extracted.keys).toEqual([]);
      }
    );

    it.each(['js', 'ts', 'jsx', 'tsx'])('ignores t (.%s)', async (ext) => {
      const code = `
        import '@tolgee/react'
        const { t } = useTranslate()

        // @tolgee-ignore
        t('uwu')
      `;

      const extracted = await extractReactKeys(code, `test.${ext}`);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it.each(['jsx', 'tsx'])('ignores <T> (.%s)', async (ext) => {
      const code = `
        import '@tolgee/react'
        function Test () {
          return (
            <div>
              {/* @tolgee-ignore */}
              <T keyName='hello-world'>Hello world!</T>
            </div>
          )
        }
      `;

      const extracted = await extractReactKeys(code, `test.${ext}`);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning upon unused marker', async () => {
      const expected = [
        { warning: 'W_UNUSED_IGNORE', line: 3 },
        { warning: 'W_UNUSED_IGNORE', line: 6 },
      ];

      const code = `
        import '@tolgee/react'
        // @tolgee-ignore
        console.log('hi cutie')

        // @tolgee-ignore
        React.createElement('div')
      `;

      const extracted = await extractReactKeys(code, 'test.js');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses warning when used', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 28 }];

      const code = `
        import '@tolgee/react'
        // @tolgee-ignore
        React.createElement(T, { keyName: \`dynamic-key-\${i}\` })
        // @tolgee-ignore
        React.createElement(T, { keyName: 'key1', ns: \`dynamic-ns-\${i}\` })
        // @tolgee-ignore
        React.createElement(T, { keyName:'key3' }, \`dynamic-\${i}\`)

        function Test2 () {
          const { t } = useTranslate('namespace')
          // @tolgee-ignore
          t(\`dynamic-key-\${i}\`)
          // @tolgee-ignore
          t('key1', { ns: \`dynamic-ns-\${i}\` })
          // @tolgee-ignore
          t('key3', \`dynamic-\${i}\`)
        }

        function Test3 () {
          // @tolgee-ignore
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
          // @tolgee-ignore
          t('key2')
        }

        function Test4 () {
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
          // @tolgee-ignore
          t('key2')
        }
      `;

      const extracted = await extractReactKeys(code, 'test.js');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses warning when used (JSX-specific)', async () => {
      const code = `
        import '@tolgee/react'
        function Test () {
          return (
            <div>
              {/* @tolgee-ignore */}
              <T keyName={\`dynamic-key-\${i}\`} />
              {/* @tolgee-ignore */}
              <T>{\`dynamic-\${i}\`}</T>
              {/* @tolgee-ignore */}
              <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
              {/* @tolgee-ignore */}
              <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
              {/* @tolgee-ignore */}
              <T keyName='key6'>{\`dynamic-\${i}\`}</T>
            </div>
          )
        }
      `;

      const extracted = await extractReactKeys(code, 'test.jsx');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });
  });

  describe('@tolgee-key', () => {
    it.each(['js', 'ts', 'jsx', 'tsx'])(
      'extracts keys specified as comments',
      async (ext) => {
        const expected = [
          { keyName: 'key1', line: 2 },
          {
            keyName: 'key2',
            namespace: 'ns',
            defaultValue: 'test value',
            line: 3,
          },
        ];

        const code = `
          // @tolgee-key key1
          // @tolgee-key { key: 'key2', ns: 'ns', defaultValue: 'test value' }
        `;

        const extracted = await extractReactKeys(code, `test.${ext}`);
        expect(extracted.keys).toEqual(expected);
      }
    );

    it('overrides data from code', async () => {
      const expected = [
        { keyName: 'key-override-1', line: 3 },
        { keyName: 'key-override-2', namespace: undefined, line: 9 },
      ];

      const code = `
        import '@tolgee/react'
        // @tolgee-key key-override-1
        React.createElement(T, { keyName: 'key-props-1' })

        function Test () {
          const { t } = useTranslate('namespace')

          // @tolgee-key key-override-2
          t('key-props-2')
        }
      `;

      const extracted = await extractReactKeys(code, 'test.js');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it('overrides data from code (JSX-specific)', async () => {
      const expected = [
        { keyName: 'key-override-1', defaultValue: undefined, line: 6 },
      ];

      const code = `
        import '@tolgee/react'
        function Test () {
          return (
            <div>
              {/* @tolgee-key key-override-1 */}
              <T keyName='hello-world'>Hello world!</T>
            </div>
          )
        }
      `;

      const extracted = await extractReactKeys(code, 'test.jsx');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("doesn't extract json5 if escaped", async () => {
      const expected = [{ keyName: '{key}', line: 3 }];

      const code = `
        import '@tolgee/react'
        // @tolgee-key \\{key}
        React.createElement(T, { keyName: 'key-props-1' })
      `;

      const extracted = await extractReactKeys(code, 'test.js');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it('suppresses warning when used', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 21 }];

      const code = `
        import '@tolgee/react'
        // @tolgee-key override-1
        React.createElement(T, { keyName: \`dynamic-key-\${i}\` })
        // @tolgee-key override-2
        React.createElement(T, { keyName: 'key1', ns: \`dynamic-ns-\${i}\` })
        // @tolgee-key override-3
        React.createElement(T, { keyName:'key3' }, \`dynamic-\${i}\`)

        function Test1 () {
          const { t } = useTranslate('namespace')
          // @tolgee-key override-4
          t(\`dynamic-key-\${i}\`)
          // @tolgee-key override-5
          t('key1', { ns: \`dynamic-ns-\${i}\` })
          // @tolgee-key override-6
          t('key3', \`dynamic-\${i}\`)
        }

        function Test2 () {
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
          // @tolgee-key override-7
          t('key2')
        }
      `;

      const extracted = await extractReactKeys(code, 'test.js');
      expect(extracted.warnings).toEqual(expected);
    });

    it('suppresses warning when used (JSX-specific) (.%s)', async () => {
      const code = `
        import '@tolgee/react'
        function Test () {
          return (
            <div>
              {/* @tolgee-key override-1 */}
              <T keyName={\`dynamic-key-\${i}\`} />
              {/* @tolgee-key override-2 */}
              <T>{\`dynamic-\${i}\`}</T>
              {/* @tolgee-key override-3 */}
              <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
              {/* @tolgee-key override-4 */}
              <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
              {/* @tolgee-key override-5 */}
              <T keyName='key6'>{\`dynamic-\${i}\`}</T>
            </div>
          )
        }
      `;

      const extracted = await extractReactKeys(code, 'test.jsx');
      expect(extracted.warnings).toEqual([]);
    });

    it('emits warning when invalid json5 is used', async () => {
      const expected = [
        { warning: 'W_MALFORMED_KEY_OVERRIDE', line: 2 },
        { warning: 'W_INVALID_KEY_OVERRIDE', line: 3 },
      ];

      const code = `
        // @tolgee-key { key: 'key2'
        // @tolgee-key { ns: 'key2' }
      `;

      const extracted = await extractReactKeys(code, 'test.js');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });
  });
});
