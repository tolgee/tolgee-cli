import JSON5 from 'json5';

export type MagicIgnoreComment = {
  type: 'MAGIC_COMMENT';
  line: number;
  kind: 'ignore';
};

export type MagicKeyComment = {
  type: 'MAGIC_COMMENT';
  line: number;
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

export type WarningEvent = { type: 'WARNING'; kind: string; line: number };

export type MagicCommentEvent =
  | MagicIgnoreComment
  | MagicKeyComment
  | WarningEvent;

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

type TokenType = {
  token: string;
  line: number;
};

export function extractComment(
  token: TokenType
): MagicCommentEvent | undefined {
  const comment = token.token.replaceAll(/[^\n]([\w]*\*+)/g, '').trim();
  if (comment.startsWith('@tolgee-ignore')) {
    return {
      type: 'MAGIC_COMMENT',
      kind: 'ignore',
      line: token.line,
    };
  }

  if (comment.startsWith('@tolgee-key')) {
    const data = comment.slice(11).trim();

    // Data is escaped; extract all as string
    if (data.startsWith('\\')) {
      return {
        type: 'MAGIC_COMMENT',
        kind: 'key',
        keyName: data.slice(1),
        line: token.line,
      };
    }

    // Data is a json5 struct
    if (data.startsWith('{')) {
      try {
        const key = JSON5.parse(data);
        if (!isValidKeyOverride(key)) {
          // No key in the struct; invalid override
          return {
            type: 'WARNING',
            kind: 'W_INVALID_KEY_OVERRIDE',
            line: token.line,
          };
        } else {
          return {
            type: 'MAGIC_COMMENT',
            kind: 'key',
            keyName: key.key,
            namespace: key.ns,
            defaultValue: key.defaultValue,
            line: token.line,
          };
        }
      } catch {
        return {
          type: 'WARNING',
          kind: 'W_MALFORMED_KEY_OVERRIDE',
          line: token.line,
        };
      }
    }
    return {
      type: 'MAGIC_COMMENT',
      kind: 'key',
      keyName: data,
      line: token.line,
    };
  }
}
