import {
  extractString,
  extractObject,
} from '../../../src/extractor/languages/javascript';

describe('strings', () => {
  it('extracts basic strings', () => {
    expect(extractString('"test string"')).toBe('test string');
    expect(extractString("'test string'")).toBe('test string');
    expect(extractString('`test string`')).toBe('test string');
    expect(extractString('"test \\" string"')).toBe('test " string');
  });

  it('returns null for dynamic strings', () => {
    expect(extractString('"aa" + x + "aa"')).toBeNull();
    expect(extractString('`aa${x}aa`')).toBeNull();

    expect(extractString('"aa + x + aa"')).toBe('aa + x + aa');
    expect(extractString('`aa\\${x}aa`')).toBe('aa${x}aa');
    expect(extractString('`aa$\\{x}aa`')).toBe('aa${x}aa');
    expect(extractString('"aa${x}aa"')).toBe('aa${x}aa');
  });
});

describe('objects', () => {
  it('extracts plain objects', () => {
    const testObject =
      '{ key1: "value1", key2: "value2\\"", key3: "value,4", key4: 0 }';
    const extracted = extractObject(testObject);

    expect(extracted.consumed).toBe(testObject.length);
    expect(extracted.extracted).toStrictEqual({
      key1: '"value1"',
      key2: '"value2\\""',
      key3: '"value,4"',
      key4: '0',
    });
  });

  it('handles declaration shortcuts', () => {
    const testObject = '{ key1: "value1", key2, key3: "value2" }';
    const extracted = extractObject(testObject);

    expect(extracted.consumed).toBe(testObject.length);
    expect(extracted.extracted).toStrictEqual({
      key1: '"value1"',
      key2: 'key2',
      key3: '"value2"',
    });
  });

  it('handles dangling commas', () => {
    const testObject = '{ key1: "value1", }';
    const extracted = extractObject(testObject);

    expect(extracted.consumed).toBe(testObject.length);
    expect(extracted.extracted).toStrictEqual({
      key1: '"value1"',
    });
  });

  describe('with complex input', () => {
    it('extracts key names as plain strings when possible', () => {
      const testObject =
        '{ "key1": 1, ["key2"]: 2, [`key3`]: 3, [var]: 4, ["a" + var]: 5, [`a${var}`]: 6 }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '1',
        key2: '2',
        key3: '3',
        '[var]': '4',
        '["a" + var]': '5',
        '[`a${var}`]': '6',
      });
    });

    it('extracts nested object values', () => {
      const testObject =
        '{ key1: "value1", key2: { subKey1: false, subKey2: {} }, key3: "value4" }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '"value1"',
        key2: '{ subKey1: false, subKey2: {} }',
        key3: '"value4"',
      });
    });

    it('extracts nested array values', () => {
      const testObject = '{ key1: "value1", key2: [ 1, 2, 3, 4, 5, 6 ] }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '"value1"',
        key2: '[ 1, 2, 3, 4, 5, 6 ]',
      });
    });

    it('extracts deeply nested array values', () => {
      const testObject = '{ key1: "value1", key2: [ 1, 2, 3, [ 4, 5 ], 6 ] }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '"value1"',
        key2: '[ 1, 2, 3, [ 4, 5 ], 6 ]',
      });
    });
  });

  describe('with function as values', () => {
    it('is not confused by basic functions', () => {
      const testObject =
        '{ key1: () => { return false }, key2: function () { return true } }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '() => { return false }',
        key2: 'function () { return true }',
      });
    });

    it('is not confused by functions with arguments', () => {
      const testObject =
        '{ key1: (arg1, arg2) => { return false }, key2: function (arg1, arg2) { return true } }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '(arg1, arg2) => { return false }',
        key2: 'function (arg1, arg2) { return true }',
      });
    });

    it('is not confused by functions with destructor-pattern arguments', () => {
      const testObject =
        '{ key1: ({ props }, arg2) => { return false }, key2: function ({ props }, arg2) { return true } }';
      const extracted = extractObject(testObject);

      expect(extracted.consumed).toBe(testObject.length);
      expect(extracted.extracted).toStrictEqual({
        key1: '({ props }, arg2) => { return false }',
        key2: 'function ({ props }, arg2) { return true }',
      });
    });
  });
});
