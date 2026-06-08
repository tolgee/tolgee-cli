import { parseHeaderList, mergeHeaders } from '#cli/utils/headers.js';

describe('parseHeaderList', () => {
  it('parses a simple header', () => {
    expect(parseHeaderList(['X-Foo: bar'])).toEqual({ 'x-foo': 'bar' });
  });

  it('trims the value', () => {
    expect(parseHeaderList(['X-Foo:   bar '])).toEqual({ 'x-foo': 'bar' });
  });

  it('splits on the first colon so the value may contain colons', () => {
    expect(parseHeaderList(['X-Url: https://example.com:8080'])).toEqual({
      'x-url': 'https://example.com:8080',
    });
  });

  it('lowercases and trims the name', () => {
    expect(parseHeaderList([' X-Foo : v'])).toEqual({ 'x-foo': 'v' });
  });

  it('allows empty values', () => {
    expect(parseHeaderList(['X-Foo:'])).toEqual({ 'x-foo': '' });
    expect(parseHeaderList(['X-Foo:    '])).toEqual({ 'x-foo': '' });
  });

  it('keeps the last value for a duplicated name', () => {
    expect(parseHeaderList(['X: 1', 'X: 2'])).toEqual({ x: '2' });
  });

  it('returns an empty object for empty or missing input', () => {
    expect(parseHeaderList(undefined)).toEqual({});
    expect(parseHeaderList([])).toEqual({});
  });

  it('throws when the colon is missing', () => {
    expect(() => parseHeaderList(['badheader'])).toThrow();
  });

  it('throws on an empty name (even after trimming)', () => {
    expect(() => parseHeaderList([': value'])).toThrow();
    expect(() => parseHeaderList(['   : value'])).toThrow();
  });

  it('throws on a name with whitespace or non-token characters', () => {
    expect(() => parseHeaderList(['X Foo: v'])).toThrow();
    expect(() => parseHeaderList(['X\tFoo: v'])).toThrow();
  });

  it('throws on control characters in the value (header injection)', () => {
    expect(() => parseHeaderList(['X-Foo: a\r\nInjected: b'])).toThrow();
  });

  it('throws on a non-CRLF control character in the value', () => {
    const nul = String.fromCharCode(0);
    expect(() => parseHeaderList([`X-Foo: a${nul}b`])).toThrow();
  });

  it('allows a horizontal tab in the value (RFC 7230 field-content)', () => {
    expect(parseHeaderList(['X-Foo: a\tb'])).toEqual({ 'x-foo': 'a\tb' });
  });
});

describe('mergeHeaders', () => {
  it('lets a CLI header override a config header of the same name', () => {
    expect(mergeHeaders({ 'x-foo': 'config' }, ['X-Foo: cli'])).toEqual({
      'x-foo': 'cli',
    });
  });

  it('overrides case-insensitively', () => {
    expect(
      mergeHeaders({ Authorization: 'config' }, ['authorization: cli'])
    ).toEqual({ authorization: 'cli' });
  });

  it('keeps config-only and CLI-only headers', () => {
    expect(mergeHeaders({ 'x-a': '1' }, ['X-B: 2'])).toEqual({
      'x-a': '1',
      'x-b': '2',
    });
  });

  it('returns an empty object for empty inputs', () => {
    expect(mergeHeaders(undefined, undefined)).toEqual({});
    expect(mergeHeaders({}, [])).toEqual({});
  });
});
