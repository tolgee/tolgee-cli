import extractKeys from '../../src/extractor/presets/react';

describe('React.createElement', () => {
  it('should extract keys specified as properties', async () => {
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('should extract keys specified as children', async () => {
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('extracts the default value from children', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

    const code = `
      React.createElement(T, { keyName: 'key1' }, "default value")
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

    const code = `
      React.createElement(T, { keyName: 'key1' }, "default value")
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('does not extract default value from children if a defaultValue prop is set', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

    const code = `
      React.createElement(T, { keyName: 'key1', defaultValue: 'default value' }, "ignored stuff")
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      React.createElement(T, { keyName: 'key1', ns: 'ns1' })
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('should not be confused by nested objects in properties', async () => {
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('should handle multiline use of createElement', async () => {
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });
});

describe('useTranslate', () => {
  it('extracts from the t call', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('extracts the default value from parameters', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', { defaultValue: 'default value' })
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('extracts the namespace from parameters', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      function Test () {
        const { t } = useTranslate()
        t('key1', { ns: 'ns1' })
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('keeps track of the namespace specified in useTranslate', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace' }];

    const code = `
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('keeps track of the namespace specified in useTranslate (array)', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace1' }];

    const code = `
      function Test () {
        const { t } = useTranslate([ 'namespace1', 'namespace2' ])
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('overrides the specified namespace if one is passed as parameter', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      function Test () {
        const { t } = useTranslate('namespace')
        t('key1', { ns: 'ns1' })
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });

  it('does not extract if there was no useTranslate call', async () => {
    const expected: any[] = [];

    const code = `
      function Test () {
        t('key1')
      }
    `;

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
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

    const extracted = await extractKeys(code, 'test.js');
    expect(extracted).toEqual(expected);
  });
});

describe('<T>', () => {
  it('should extract keys specified as properties', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <T keyName='key1'/>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('should extract keys specified as properties with curly braces', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <T keyName={'key1'}/>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('should extract keys specified as children', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <T>key1</T>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('extracts the default value from children', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value1' }];

    const code = `
      <T keyName='key1'>default value1</T>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value1' }];

    const code = `
      <T keyName='key1' defaultValue='default value1'/>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('does not extract default value from children if a defaultValue prop is set', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'default value1' }];

    const code = `
      <T keyName='key1' defaultValue='default value1'>unused</T>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1' }];

    const code = `
      <T keyName='key1' ns='ns1'/>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('does not extract from unrelated components', async () => {
    const expected = [{ keyName: 'key1' }];

    const code = `
      <div keyName='not key1'>
        <T keyName='key1'/>
      </div>
    `;

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  it('handle multiline use', async () => {
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

    const extracted = await extractKeys(code, 'test.jsx');
    expect(extracted).toEqual(expected);
  });

  // todo: not really important, but a good QOL thing to have.
  it.failing(
    'should unroll static JSX compound expressions that only contain a string',
    async () => {
      const expected = [
        { keyName: 'key1', defaultValue: 'children with spaces' },
      ];

      const code = `
      <T keyName='key1'>children{' '}with{' '}spaces</T>
    `;

      const extracted = await extractKeys(code, 'test.jsx');
      expect(extracted).toEqual(expected);
    }
  );
});
