import extractKeys from '../../src/extractor/presets/react';

describe.each(['js', 'ts', 'jsx', 'tsx'])(
  'React.createElement (.%s)',
  (ext) => {
    const FILE_NAME = `test.${ext}`;

    it('extracts keys specified as properties', async () => {
      const expected = [
        { keyName: 'key1' },
        { keyName: 'key2' },
        { keyName: 'key3' },
        { keyName: 'key4' },
        { keyName: 'key5', defaultValue: 'not key6' },
      ];

      const code = `
        React.createElement(T, { keyName: "key1" })
        React.createElement(T, { keyName: 'key2' })
        React.createElement(T, { keyName: \`key3\` })
        React.createElement(T, { someProp: 'a', keyName: 'key4' })
        React.createElement(T, { keyName: 'key5', someProp: 'a' }, 'not key6')
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts keys specified as children', async () => {
      const expected = [
        { keyName: 'key1' },
        { keyName: 'key2' },
        { keyName: 'key3' },
        { keyName: 'key4' },
        { keyName: 'key5' },
      ];

      const code = `
        React.createElement(T, {}, "key1")
        React.createElement(T, {}, 'key2')
        React.createElement(T, {}, \`key3\`)
        React.createElement(T, null, 'key4')
        React.createElement(T, {}, 'key5', React.createElement('hr'))
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts the default value from children', async () => {
      const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

      const code = `
        React.createElement(T, { keyName: 'key1' }, "default value")
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts the default value from props', async () => {
      const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

      const code = `
        React.createElement(T, { keyName: 'key1' }, "default value")
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('does not extract default value from children if a defaultValue prop is set', async () => {
      const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

      const code = `
        React.createElement(T, { keyName: 'key1', defaultValue: 'default value' }, "ignored stuff")
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('extracts the namespace from props', async () => {
      const expected = [{ keyName: 'key1', namespace: 'ns1' }];

      const code = `
        React.createElement(T, { keyName: 'key1', ns: 'ns1' })
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('is not be confused by nested objects in properties', async () => {
      const expected = [
        { keyName: 'key1' },
        { keyName: 'key2' },
        { keyName: 'key3' },
        { keyName: 'key4' },
      ];

      const code = `
        React.createElement(T, { someProp: { a: false }, keyName: 'key1' })
        React.createElement(T, { someProp: { a: false } }, 'key2')
        React.createElement(T, { keyName: 'key3', someProp: { keyName: 'not key3' } })
        React.createElement(T, { someProp: { keyName: 'not key4' }, keyName: 'key4' })
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('handles multiline use of createElement', async () => {
      const expected = [
        { keyName: 'key1' },
        { keyName: 'key2' },
        { keyName: 'key3' },
        { keyName: 'key4' },
        { keyName: 'key5' },
        { keyName: 'key6' },
      ];

      const code = `
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

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it('handles weird/lack of spacing in declarations', async () => {
      const expected = [{ keyName: 'key1' }, { keyName: 'key2' }];

      const code = `
        React         .    createElement     (    T,     {     keyName: 'key1' })
        React.createElement(T,{keyName:'key2'})
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    describe('dynamic data', () => {
      it('emits warning on dynamic keys and skips', async () => {
        const expected = [
          { warning: 'W_DYNAMIC_KEY', line: 2 },
          { warning: 'W_DYNAMIC_KEY', line: 3 },
          { warning: 'W_DYNAMIC_KEY', line: 4 },
          { warning: 'W_DYNAMIC_KEY', line: 5 },
        ];

        const code = `
          React.createElement(T, { keyName: \`dynamic-key-\${i}\` })
          React.createElement(T, { keyName: 'dynamic-key-' + i })
          React.createElement(T, { keyName: key })
          React.createElement(T, { keyName })
        `;

        const extracted = await extractKeys(code, FILE_NAME);
        expect(extracted.warnings).toEqual(expected);
        expect(extracted.keys).toEqual([]);
      });

      it('emits warning on dynamic namespace and skips', async () => {
        const expected = [
          { warning: 'W_DYNAMIC_NAMESPACE', line: 2 },
          { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
          { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
          { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
        ];

        const code = `
          React.createElement(T, { keyName: 'key1', ns: \`dynamic-ns-\${i}\` })
          React.createElement(T, { keyName: 'key2', ns: 'dynamic-ns-' + i })
          React.createElement(T, { keyName: 'key2', ns: ns })
          React.createElement(T, { keyName: 'key2', ns })
        `;

        const extracted = await extractKeys(code, FILE_NAME);
        expect(extracted.warnings).toEqual(expected);
        expect(extracted.keys).toEqual([]);
      });

      it('emits warning for dynamic default values, but extracts keys', async () => {
        const expectedWarnings = [
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 2 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 3 },
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 4 },
        ];

        const expectedKeys = [
          { keyName: 'key1', defaultValue: undefined },
          { keyName: 'key2', defaultValue: undefined },
          { keyName: 'key3', defaultValue: undefined },
        ];

        const code = `
          React.createElement(T, { keyName:'key1' }, someValue)
          React.createElement(T, { keyName:'key2' }, 'dynamic-' + i)
          React.createElement(T, { keyName:'key3' }, \`dynamic-\${i}\`)
        `;

        const extracted = await extractKeys(code, FILE_NAME);
        expect(extracted.warnings).toEqual(expectedWarnings);
        expect(extracted.keys).toEqual(expectedKeys);
      });
    });
  }
);

describe.each(['js', 'ts', 'jsx', 'tsx'])('useTranslate (.%s)', (ext) => {
  const FILE_NAME = `test.${ext}`;

  it('extracts from the t call with signature t(string))', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string)', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', 'default value')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string, opts)', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value', namespace: 'ns' },
    ];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', 'default value', { ns: 'ns', defaultValue: 'ignored' })
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, opts)', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value', namespace: 'ns' },
    ];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', { defaultValue: 'default value', ns: 'ns' })
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(opts)', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value', namespace: 'ns' },
    ];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t({ key: 'key1', defaultValue: 'default value', ns: 'ns' })
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from parameters', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', { defaultValue: 'default value' })
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from parameters', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', { ns: 'ns1' })
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in useTranslate', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace' }];

    const code = `
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in useTranslate (array)', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace1' }];

    const code = `
      function Test () {
        const { t } = useTranslate([ 'namespace1', 'namespace2' ])
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('overrides the specified namespace if one is passed as parameter', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1', { ns: 'ns1' })
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract if there was no useTranslate call', async () => {
    const expected: any[] = [];

    const code = `
      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract if the useTranslate call was in an unrelated block', async () => {
    const expected: any[] = [];

    const code = `
      function Meow () {
        const { t } = useTranslate()
      }

      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract if the useTranslate call was in a deeper block', async () => {
    const expected: any[] = [];

    const code = `
      function Test () {
        function Meow () {
          const { t } = useTranslate()
        }
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the right namespace when multiple useTranslates are in use', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns-test' },
      { keyName: 'key2', namespace: 'ns-meow' },
      { keyName: 'key3', namespace: 'ns-test' },
    ];

    const code = `
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

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles multi-line use', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace' }];

    const code = `
      function Test () {
        const { t } = useTranslate(
          'namespace'
        )

        t(
          'key1'
        )
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles weird spacings', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace' }];

    const code = `
      function Test () {
        const { t } = useTranslate         (   'namespace')
        t     (      'key1')
      }
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 4 },
        { warning: 'W_DYNAMIC_KEY', line: 5 },
        { warning: 'W_DYNAMIC_KEY', line: 6 },
      ];

      const code = `
        function Test () {
          const { t } = useTranslate('namespace')
          t(\`dynamic-key-\${i}\`)
          t('dynamic-key-' + i)
          t(key)
        }
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace (within t) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
      ];

      const code = `
        function Test () {
          const { t } = useTranslate('namespace')
          t('key1', { ns: \`dynamic-ns-\${i}\` })
          t('key2', { ns: 'dynamic-ns-' + i })
          t('key2', { ns: ns })
          t('key2', { ns })
        }
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warnings on dynamic namespace (within useTranslate) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 4 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 9 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 13 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 14 },
      ];

      const code = `
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

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('extracts if useTranslate is dynamic but a static override is specified', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 4 },
      ];

      const expectedKeys = [
        { keyName: 'key2', namespace: 'static-ns' },
      ];

      const code = `
        function Test3 () {
          const { t } = useTranslate(ns)
          t('key1')
          t('key2', { ns: 'static-ns' })
        }
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });

    it('emits warning for dynamic default values, but extracts keys', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 4 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 5 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined },
        { keyName: 'key2', defaultValue: undefined },
        { keyName: 'key3', defaultValue: undefined },
      ];

      const code = `
        function Test3 () {
          const { t } = useTranslate()
          t('key1', someValue)
          t('key2', 'dynamic-' + i)
          t('key3', \`dynamic-\${i}\`)
        }
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});

describe.each(['jsx', 'tsx'])('<T> (.%s)', (ext) => {
  const FILE_NAME = `test.${ext}`;

  it('extracts keys specified as properties', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <T keyName='key1'/>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as properties with curly braces', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <T keyName={'key1'}/>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as children', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <T>key1</T>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from children', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1' },
      { keyName: 'key2', defaultValue: 'default value2' },
    ];

    const code = `
      <T keyName='key1'>default value1</T>
      <T keyName='key2'>{'default value2'}</T>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value1' }];

    const code = `
      <T keyName='key1' defaultValue='default value1'/>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract default value from children if a defaultValue prop is set', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value1' }];

    const code = `
      <T keyName='key1' defaultValue='default value1'>unused</T>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      <T keyName='key1' ns='ns1'/>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract from unrelated components', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <div keyName='not key1'>
        <T keyName='key1'/>
      </div>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('is undisturbed by objects in properties', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'value' }];

    const code = `
      <T properties={{ a: 'b' }} keyName='key1'>value</T>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles multiline use', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns1', defaultValue: 'default value1' },
      { keyName: 'key2', namespace: 'ns2', defaultValue: 'default value2' },
      {
        keyName: 'key3',
        namespace: 'ns3',
        defaultValue:
          'sometimes, you really have to deal with a lot of whitespaces...',
      },
    ];

    const code = `
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

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('unrolls static JSX compound expressions that only contain a string', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'children with spaces' },
    ];

    const code = `
      <T keyName='key1'>children{' '}with{' '}spaces</T>
    `;

    const extracted = await extractKeys(code, FILE_NAME);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });


  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 2 },
        { warning: 'W_DYNAMIC_KEY', line: 3 },
        { warning: 'W_DYNAMIC_KEY', line: 4 },
        { warning: 'W_DYNAMIC_KEY', line: 5 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
        { warning: 'W_DYNAMIC_KEY', line: 8 },
        { warning: 'W_DYNAMIC_KEY', line: 9 },
      ];

      const code = `
        <T keyName={\`dynamic-key-\${i}\`} />
        <T keyName={'dynamic-key-' + i} />
        <T keyName={key} />
        <T keyName />

        <T>{key}</T>
        <T>{'dynamic-' + i}</T>
        <T>{\`dynamic-\${i}\`}</T>
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 2 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
      ];

      const code = `
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <T keyName='key2' ns={'dynamic-ns-' + i} />
        <T keyName='key2' ns={ns} />
        <T keyName='key2' ns/>
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning for dynamic default values, but extracts keys', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 2 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 3 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 4 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 5 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 7 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined },
        { keyName: 'key2', defaultValue: undefined },
        { keyName: 'key3', defaultValue: undefined },
        { keyName: 'key4', defaultValue: undefined },
        { keyName: 'key5', defaultValue: undefined },
        { keyName: 'key6', defaultValue: undefined },
      ];

      const code = `
        <T keyName='key1' defaultValue={someValue}/>
        <T keyName='key2' defaultValue={'dynamic-' + i}/>
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
        <T keyName='key4'>{someValue}</T>
        <T keyName='key5'>{'dynamic-' + i}</T>
        <T keyName='key6'>{\`dynamic-\${i}\`}</T>
      `;

      const extracted = await extractKeys(code, FILE_NAME);
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});
