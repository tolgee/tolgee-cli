import extractKeys from '../../src/extractor/presets/react';

describe('React.createElement', () => {
  it('should extract keys specified as children', async () => {
    const expected = ['key1', 'key2', 'key3', 'key4', 'key5'];
    const code = `
      React.createElement(T, {}, "key1")
      React.createElement(T, {}, 'key2')
      React.createElement(T, {}, \`key3\`)
      React.createElement(T, null, 'key4')
      React.createElement(T, {}, 'key5', React.createElement('hr'))
    `;

    const extracted = await extractKeys(code);
    expect(extracted.sort()).toStrictEqual(expected.sort());
  });

  it('should extract keys specified as properties', async () => {
    const expected = ['key1', 'key2', 'key3', 'key4', 'key5'];
    const code = `
      React.createElement(T, { keyName: "key1" })
      React.createElement(T, { keyName: 'key2' })
      React.createElement(T, { keyName: \`key3\` })
      React.createElement(T, { someProp: 'a', keyName: 'key4' })
      React.createElement(T, { keyName: 'key5', someProp: 'a' }, 'not key6')
    `;

    const extracted = await extractKeys(code);
    expect(extracted.sort()).toStrictEqual(expected.sort());
  });

  it('should not be confused by nested objects in properties', async () => {
    const expected = ['key1', 'key2', 'key3', 'key4'];
    const code = `
      React.createElement(T, { someProp: { a: false }, keyName: 'key1' })
      React.createElement(T, { someProp: { a: false } }, 'key2')
      React.createElement(T, { keyName: 'key3', someProp: { keyName: 'not key3' } })
      React.createElement(T, { someProp: { keyName: 'not key4' }, keyName: 'key4' })
    `;

    const extracted = await extractKeys(code);
    expect(extracted.sort()).toStrictEqual(expected.sort());
  });

  it('should handle multiline use of createElement', async () => {
    const expected = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6'];
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

    const extracted = await extractKeys(code);
    expect(extracted.sort()).toStrictEqual(expected.sort());
  });
});
