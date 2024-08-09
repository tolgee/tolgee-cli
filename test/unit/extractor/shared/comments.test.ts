import { extractComment } from '#cli/extractor/parser/extractComment.js';

it('notifies ignore comment has been found', () => {
  expect(extractComment({ token: ' @tolgee-ignore', line: 1 })).toEqual({
    type: 'MAGIC_COMMENT',
    kind: 'ignore',
    line: 1,
  });
});

it('notifies key comment has been found', () => {
  expect(extractComment({ token: ' @tolgee-key meow', line: 1 })).toEqual({
    type: 'MAGIC_COMMENT',
    kind: 'key',
    keyName: 'meow',
    line: 1,
  });
});

it('extracts json5 struct from comment', () => {
  expect(
    extractComment({
      token: ' @tolgee-key { key: "meow", ns: "nya" }',
      line: 1,
    })
  ).toEqual({
    type: 'MAGIC_COMMENT',
    kind: 'key',
    keyName: 'meow',
    namespace: 'nya',
    line: 1,
  });
});

it('ignores random comments', () => {
  expect(extractComment({ token: ' @tolgee-aze', line: 1 })).toBeUndefined();

  expect(
    extractComment({ token: ' something something', line: 1 })
  ).toBeUndefined();

  expect(extractComment({ token: 'zzzzzzzzzz', line: 1 })).toBeUndefined();
});

it("doesn't parse escaped json5", () => {
  expect(
    extractComment({
      token: ' @tolgee-key \\{key:"t"}',
      line: 1,
    })
  ).toEqual({
    type: 'MAGIC_COMMENT',
    kind: 'key',
    keyName: '{key:"t"}',
    line: 1,
  });
});

it('warns on invalid json5', () => {
  expect(
    extractComment({
      token: ' @tolgee-key { key: "key ',
      line: 1,
    })
  ).toEqual({
    type: 'WARNING',
    kind: 'W_MALFORMED_KEY_OVERRIDE',
    line: 1,
  });
});

it('warns on missing key in json5', () => {
  expect(
    extractComment({
      token: ' @tolgee-key { ns: "nya" }',
      line: 1,
    })
  ).toEqual({ type: 'WARNING', kind: 'W_INVALID_KEY_OVERRIDE', line: 1 });

  expect(
    extractComment({ token: ' something something', line: 1 })
  ).toBeUndefined();

  expect(extractComment({ token: 'zzzzzzzzzz', line: 1 })).toBeUndefined();
});
