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

describe.each(['js', 'ts', 'jsx', 'tsx'])(
  'React.createElement (.%s)',
  (ext) => {
    const FILE_NAME = `test.${ext}`;

    it('extracts keys specified as properties', async () => {
      const expected = [
        { keyName: 'key1', line: 3 },
        { keyName: 'key2', line: 4 },
        { keyName: 'key3', line: 5 },
        { keyName: 'key4', line: 6 },
        { keyName: 'key5', defaultValue: 'not key6', line: 7 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { keyName: "key1" })
        React.createElement(T, { keyName: 'key2' })
        React.createElement(T, { keyName: \`key3\` })
        React.createElement(T, { someProp: 'a', keyName: 'key4' })
        React.createElement(T, { keyName: 'key5', someProp: 'a' }, 'not key6')
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts keys specified as children', async () => {
      const expected = [
        { keyName: 'key1', line: 3 },
        { keyName: 'key2', line: 4 },
        { keyName: 'key3', line: 5 },
        { keyName: 'key4', line: 6 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, {}, "key1")
        React.createElement(T, {}, 'key2')
        React.createElement(T, {}, \`key3\`)
        React.createElement(T, null, 'key4')
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts the default value from children', async () => {
      const expected = [
        { keyName: 'key1', defaultValue: 'default value', line: 3 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { keyName: 'key1' }, "default value")
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts the default value from props', async () => {
      const expected = [
        { keyName: 'key1', defaultValue: 'default value', line: 3 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { keyName: 'key1' }, "default value")
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('does not extract default value from children if a defaultValue prop is set', async () => {
      const expected = [
        { keyName: 'key1', defaultValue: 'default value', line: 3 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { keyName: 'key1', defaultValue: 'default value' }, "ignored stuff")
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts the namespace from props', async () => {
      const expected = [
        { keyName: 'key1', namespace: 'ns1', line: 3 },
        { keyName: 'key2', namespace: '', line: 4 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { keyName: 'key1', ns: 'ns1' })
        React.createElement(T, { keyName: 'key2', ns: '' })
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('correctly uses default namespace', async () => {
      const expected = [
        { keyName: 'key1', namespace: 'ns1', line: 3 },
        { keyName: 'key2', namespace: '', line: 4 },
        { keyName: 'key2', namespace: 'test', line: 5 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { keyName: 'key1', ns: 'ns1' })
        React.createElement(T, { keyName: 'key2', ns: '' })
        React.createElement(T, { keyName: 'key2' })
      `;

      const extracted = await extractReactKeys(code, FILE_NAME, {
        defaultNamespace: 'test',
      });
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('is not be confused by nested objects in properties', async () => {
      const expected = [
        { keyName: 'key1', line: 3 },
        { keyName: 'key2', line: 4 },
        { keyName: 'key3', line: 5 },
        { keyName: 'key4', line: 6 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(T, { someProp: { a: false }, keyName: 'key1' })
        React.createElement(T, { someProp: { a: false } }, 'key2')
        React.createElement(T, { keyName: 'key3', someProp: { keyName: 'not key3' } })
        React.createElement(T, { someProp: { keyName: 'not key4' }, keyName: 'key4' })
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('handles multiline use of createElement', async () => {
      const expected = [
        { keyName: 'key1', line: 3 },
        { keyName: 'key2', line: 7 },
        { keyName: 'key3', line: 10 },
        { keyName: 'key4', line: 16 },
        { keyName: 'key5', line: 22 },
        { keyName: 'key6', line: 27 },
      ];

      const code = `
        import '@tolgee/react'
        React.createElement(
          T,
          { keyName: 'key1' }
        )
        React.createElement(T, {
          keyName: 'key2'
        })
        React.createElement(T, {
          a: 'x',
          b: {},
          keyName: 'key3'
        })

        React.createElement(T, {
          a: 'x',
          b: { keyName: 'not key4' },
          keyName: 'key4'
        })

        React.createElement(
          T,
          {},
          'key5'
        )
        React.createElement(T, {
          someProp: 'a'
        }, 'key6')
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('handles weird/lack of spacing in declarations', async () => {
      const expected = [
        { keyName: 'key1', line: 3 },
        { keyName: 'key2', line: 4 },
      ];

      const code = `
        import '@tolgee/react'
        React         .    createElement     (    T,     {     keyName: 'key1' })
        React.createElement(T,{keyName:'key2'})
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    describe('dynamic data', () => {
      it('emits warning on dynamic keys and skips', async () => {
        const expected = [
          { warning: 'W_DYNAMIC_KEY', line: 3 },
          { warning: 'W_DYNAMIC_KEY', line: 4 },
          { warning: 'W_DYNAMIC_KEY', line: 5 },
          { warning: 'W_DYNAMIC_KEY', line: 6 },
        ];

        const code = `
          import '@tolgee/react'
          React.createElement(T, { keyName: \`dynamic-key-\${i}\` })
          React.createElement(T, { keyName: 'dynamic-key-' + i })
          React.createElement(T, { keyName: key })
          React.createElement(T, { keyName })
        `;

        const extracted = await extractReactKeys(code, FILE_NAME);
        expect(extracted.warnings).toEqual(expected);
        expect(extracted.keys).toEqual([]);
      });

      it('emits warning on dynamic namespace and skips', async () => {
        const expected = [
          { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
          { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
          { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
          { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        ];

        const code = `
          import '@tolgee/react'
          React.createElement(T, { keyName: 'key1', ns: \`dynamic-ns-\${i}\` })
          React.createElement(T, { keyName: 'key2', ns: 'dynamic-ns-' + i })
          React.createElement(T, { keyName: 'key2', ns: ns })
          React.createElement(T, { keyName: 'key2', ns })
        `;

        const extracted = await extractReactKeys(code, FILE_NAME);
        expect(extracted.warnings).toEqual(expected);
        expect(extracted.keys).toEqual([]);
      });

      it('emits warning for dynamic default values, but extracts keys', async () => {
        const expectedWarnings = [
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 3 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 4 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 5 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 7 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 8 },
        ];

        const expectedKeys = [
          { keyName: 'key1', defaultValue: undefined, line: 3 },
          { keyName: 'key2', defaultValue: undefined, line: 4 },
          { keyName: 'key3', defaultValue: undefined, line: 5 },
          { keyName: 'key4', defaultValue: undefined, line: 6 },
          { keyName: 'key5', defaultValue: undefined, line: 7 },
          { keyName: 'key6', defaultValue: undefined, line: 8 },
        ];

        const code = `
          import '@tolgee/react'
          React.createElement(T, { keyName:'key1' }, someValue)
          React.createElement(T, { keyName:'key2' }, 'dynamic-' + i)
          React.createElement(T, { keyName:'key3' }, \`dynamic-\${i}\`)
          React.createElement(T, { keyName:'key4', defaultValue: someValue })
          React.createElement(T, { keyName:'key5', defaultValue: 'dynamic-' + i })
          React.createElement(T, { keyName:'key6', defaultValue: \`dynamic-\${i}\` })
        `;

        const extracted = await extractReactKeys(code, FILE_NAME);
        expect(extracted.warnings).toEqual(expectedWarnings);
        expect(extracted.keys).toEqual(expectedKeys);
      });
    });
  }
);
