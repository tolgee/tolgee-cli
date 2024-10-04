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

describe.each(['jsx', 'tsx'])('<T> (.%s)', (ext) => {
  const FILE_NAME = `test.${ext}`;

  it('extracts keys specified as properties', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T keyName='key1'/>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as properties with curly braces', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T keyName={'key1'}/>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as children', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T>key1</T>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from children', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1', line: 3 },
      { keyName: 'key2', defaultValue: 'default value2', line: 4 },
    ];

    const code = `
      import '@tolgee/react'
      <T keyName='key1'>default value1</T>
      <T keyName='key2'>{'default value2'}</T>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1', line: 3 },
    ];

    const code = `
      import '@tolgee/react'
      <T keyName='key1' defaultValue='default value1'/>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('understands empty children', async () => {
    const expected = [{ keyName: 'key1', line: 4 }];

    const code = `
      import { T } from '@tolgee/react';
      function () {
        <T keyName="key1"></T>
      }
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract default value from children if a defaultValue prop is set', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1', line: 3 },
    ];

    const code = `
      import '@tolgee/react'
      <T keyName='key1' defaultValue='default value1'>unused</T>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T keyName='key1' ns='ns1'/>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('uses default namespace if not specified', async () => {
    const expected = [{ keyName: 'key1', namespace: 'test', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T keyName='key1' />
    `;

    const extracted = await extractReactKeys(code, FILE_NAME, {
      defaultNamespace: 'test',
    });
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract from unrelated components', async () => {
    const expected = [{ keyName: 'key1', line: 4 }];

    const code = `
      import '@tolgee/react'
      <div keyName='not key1'>
        <T keyName='key1'/>
      </div>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('is undisturbed by objects in properties', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'value', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T properties={{ a: 'b' }} keyName='key1'>value</T>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles multiline use', async () => {
    const expected = [
      {
        keyName: 'key1',
        namespace: 'ns1',
        defaultValue: 'default value1',
        line: 3,
      },
      {
        keyName: 'key2',
        namespace: 'ns2',
        defaultValue: 'default value2',
        line: 9,
      },
      {
        keyName: 'key3',
        namespace: 'ns3',
        defaultValue:
          'sometimes, you really have to deal with a lot of whitespaces...',
        line: 13,
      },
    ];

    const code = `
      import '@tolgee/react'
      <T
        keyName='key1'
        ns='ns1'
        defaultValue='default value1'
      />

      <T keyName='key2' ns='ns2'>
        default value2
      </T>

      <T keyName='key3' ns='ns3'>
        sometimes, you really have to
        deal with a lot of whitespaces...
      </T>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('unrolls static JSX compound expressions that only contain a string', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'children with spaces', line: 3 },
    ];

    const code = `
      import '@tolgee/react'
      <T keyName='key1'>children{' '}with{' '}spaces</T>
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not get confused by tags interpolation', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T
        keyName='key1'
        params={{ strong: <strong>{something}</strong> }}
      />
    `;

    const extracted = await extractReactKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not get confused by self-closing tags interpolation', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      import '@tolgee/react'
      <T
        keyName='key1'
        params={{ strong: <strong /> }}
      />
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
        { warning: 'W_DYNAMIC_KEY', line: 7 },
        { warning: 'W_DYNAMIC_KEY', line: 9 },
        { warning: 'W_DYNAMIC_KEY', line: 10 },
        { warning: 'W_DYNAMIC_KEY', line: 11 },
        { warning: 'W_DYNAMIC_KEY', line: 12 },
      ];

      const code = `
        import '@tolgee/react'
        <T keyName={\`dynamic-key-\${i}\`} />
        <T keyName={'dynamic-key-' + i} />
        <T keyName={key} />
        <T keyName={a.key} />
        <T keyName />

        <T>{key}</T>
        <T>{a.key}</T>
        <T>{'dynamic-' + i}</T>
        <T>{\`dynamic-\${i}\`}</T>
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
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
      ];

      const code = `
        import '@tolgee/react'
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <T keyName='key2' ns={'dynamic-ns-' + i} />
        <T keyName='key2' ns={ns} />
        <T keyName='key2' ns={a.ns} />
        <T keyName='key2' ns/>
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
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 9 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined, line: 3 },
        { keyName: 'key2', defaultValue: undefined, line: 4 },
        { keyName: 'key3', defaultValue: undefined, line: 5 },
        { keyName: 'key4', defaultValue: undefined, line: 6 },
        { keyName: 'key5', defaultValue: undefined, line: 7 },
        { keyName: 'key6', defaultValue: undefined, line: 8 },
        { keyName: 'key7', defaultValue: undefined, line: 9 },
      ];

      const code = `
        import '@tolgee/react'
        <T keyName='key1' defaultValue={someValue}/>
        <T keyName='key2' defaultValue={'dynamic-' + i}/>
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
        <T keyName='key4'>{someValue}</T>
        <T keyName='key5'>{'dynamic-' + i}</T>
        <T keyName='key6'>{\`dynamic-\${i}\`}</T>
        <T keyName='key7'>{a.someValue}</T>
      `;

      const extracted = await extractReactKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});
