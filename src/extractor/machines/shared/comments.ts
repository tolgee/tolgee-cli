import type { Sender, Receiver } from 'xstate';
import { parse } from 'json5';

export type MagicIgnoreComment = {
  kind: 'ignore';
};

export type MagicKeyComment = {
  kind: 'key';
  keyName: string;
  namespace?: string;
  defaultValue?: string;
};

export type CommentEvent = {
  type: 'COMMENT';
  data: string;
  line: number;
};

export type MagicCommentEvent = { type: 'MAGIC_COMMENT'; line: number } & (
  | MagicIgnoreComment
  | MagicKeyComment
);

export type WarningEvent = { type: 'WARNING'; kind: string; line: number };

type KeyOverride = { key: string; ns?: string; defaultValue?: string };

function isValidKeyOverride(data: any): data is KeyOverride {
  if (!('key' in data)) {
    return false;
  }

  if (typeof data.key !== 'string') {
    return false;
  }

  if ('ns' in data && typeof data.ns !== 'string') {
    return false;
  }

  if ('defaultValue' in data && typeof data.defaultValue !== 'string') {
    return false;
  }

  return true;
}

// This service is responsible for emitting events when magic comments are encountered
export default function (
  callback: Sender<MagicCommentEvent | WarningEvent>,
  onReceive: Receiver<CommentEvent>
) {
  onReceive((evt) => {
    const comment = evt.data.trim();
    if (comment.startsWith('@tolgee-ignore')) {
      return callback({
        type: 'MAGIC_COMMENT',
        kind: 'ignore',
        line: evt.line,
      });
    }

    if (comment.startsWith('@tolgee-key')) {
      const data = comment.slice(11).trim();

      // Data is escaped; extract all as string
      if (data.startsWith('\\')) {
        return callback({
          type: 'MAGIC_COMMENT',
          kind: 'key',
          keyName: data.slice(1),
          line: evt.line,
        });
      }

      // Data is a json5 struct
      if (data.startsWith('{')) {
        try {
          const key = parse(data);
          if (!isValidKeyOverride(key)) {
            // No key in the struct; invalid override
            callback({
              type: 'WARNING',
              kind: 'W_INVALID_KEY_OVERRIDE',
              line: evt.line,
            });
          } else {
            callback({
              type: 'MAGIC_COMMENT',
              kind: 'key',
              keyName: key.key,
              namespace: key.ns,
              defaultValue: key.defaultValue,
              line: evt.line,
            });
          }
        } catch {
          callback({
            type: 'WARNING',
            kind: 'W_MALFORMED_KEY_OVERRIDE',
            line: evt.line,
          });
        }

        return;
      }

      callback({
        type: 'MAGIC_COMMENT',
        kind: 'key',
        keyName: data,
        line: evt.line,
      });
    }
  });
}
