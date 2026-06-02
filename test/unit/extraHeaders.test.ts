import { parseExtraHeadersArg } from '#cli/utils/extraHeaders.js';

describe('parseExtraHeadersArg', () => {
  it('parses comma-separated Name=Value pairs', () => {
    expect(parseExtraHeadersArg('X-Foo=bar, X-Baz=qux')).toEqual({
      'X-Foo': 'bar',
      'X-Baz': 'qux',
    });
  });

  it('trims whitespace around names and values', () => {
    expect(parseExtraHeadersArg('  X-Foo = bar  ')).toEqual({
      'X-Foo': 'bar',
    });
  });

  it('keeps "=" characters inside the value', () => {
    expect(parseExtraHeadersArg('X-Token=abc=def=ghi')).toEqual({
      'X-Token': 'abc=def=ghi',
    });
  });

  it('skips empty segments', () => {
    expect(parseExtraHeadersArg('X-Foo=bar,,X-Baz=qux,')).toEqual({
      'X-Foo': 'bar',
      'X-Baz': 'qux',
    });
  });

  it('returns empty for empty input', () => {
    expect(parseExtraHeadersArg('')).toEqual({});
    expect(parseExtraHeadersArg('   ')).toEqual({});
  });

  it('rejects malformed pairs', () => {
    expect(() => parseExtraHeadersArg('not-a-header')).toThrow();
    expect(() => parseExtraHeadersArg('=missing-name')).toThrow();
  });
});
