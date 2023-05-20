import { jest } from '@jest/globals';

import commentsService from '../../../../src/extractor/machines/shared/comments.js';

let callback: jest.Mock;
let send: (...args: any) => any;
let cleanup: ((...args: any) => any) | void;

beforeEach(() => {
  callback = jest.fn();
  cleanup = commentsService(callback, (r) => (send = r));
});

afterEach(() => {
  cleanup?.();
});

it('notifies ignore comment has been found', () => {
  send({ type: 'COMMENT', data: ' @tolgee-ignore', line: 1 });

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    type: 'MAGIC_COMMENT',
    kind: 'ignore',
    line: 1,
  });
});

it('notifies key comment has been found', () => {
  send({ type: 'COMMENT', data: ' @tolgee-key meow', line: 1 });

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    type: 'MAGIC_COMMENT',
    kind: 'key',
    keyName: 'meow',
    line: 1,
  });
});

it('extracts json5 struct from comment', () => {
  send({
    type: 'COMMENT',
    data: ' @tolgee-key { key: "meow", ns: "nya" }',
    line: 1,
  });

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    type: 'MAGIC_COMMENT',
    kind: 'key',
    keyName: 'meow',
    namespace: 'nya',
    line: 1,
  });
});

it('ignores random comments', () => {
  send({ type: 'COMMENT', data: ' @tolgee-aze', line: 1 });
  send({ type: 'COMMENT', data: ' something something', line: 1 });
  send({ type: 'COMMENT', data: 'zzzzzzzzzz', line: 1 });

  expect(callback).not.toHaveBeenCalled();
});

it("doesn't parse escaped json5", () => {
  send({ type: 'COMMENT', data: ' @tolgee-key \\{key:"t"}', line: 1 });

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    type: 'MAGIC_COMMENT',
    kind: 'key',
    keyName: '{key:"t"}',
    line: 1,
  });
});

it('warns on invalid json5', () => {
  send({ type: 'COMMENT', data: ' @tolgee-key { key: "key ', line: 1 });

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    type: 'WARNING',
    kind: 'W_MALFORMED_KEY_OVERRIDE',
    line: 1,
  });
});

it('warns on missing key in json5', () => {
  send({ type: 'COMMENT', data: ' @tolgee-key { ns: "nya" }', line: 1 });
  send({ type: 'COMMENT', data: ' something something', line: 1 });
  send({ type: 'COMMENT', data: 'zzzzzzzzzz', line: 1 });

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    type: 'WARNING',
    kind: 'W_INVALID_KEY_OVERRIDE',
    line: 1,
  });
});
