import JSON5 from 'json5';

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

export type WarningEvent = { type: 'WARNING'; kind: string; line: number };

export type MagicCommentEvent =
  | ({ type: 'MAGIC_COMMENT'; line: number } & (
      | MagicIgnoreComment
      | MagicKeyComment
    ))
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

function getEndLine(token: TokenType) {
  return token.line + (token.token.match(/\n/gm)?.length ?? 0);
}

type TokenType = {
  token: string;
  line: number;
};

export function extractComment(
  token: TokenType
): MagicCommentEvent | undefined {
  const comment = token.token.trim();
  if (comment.startsWith('@tolgee-ignore')) {
    return {
      type: 'MAGIC_COMMENT',
      kind: 'ignore',
      line: getEndLine(token),
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
        line: getEndLine(token),
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
            line: getEndLine(token),
          };
        } else {
          return {
            type: 'MAGIC_COMMENT',
            kind: 'key',
            keyName: key.key,
            namespace: key.ns,
            defaultValue: key.defaultValue,
            line: getEndLine(token),
          };
        }
      } catch {
        return {
          type: 'WARNING',
          kind: 'W_MALFORMED_KEY_OVERRIDE',
          line: getEndLine(token),
        };
      }
    }
    return {
      type: 'MAGIC_COMMENT',
      kind: 'key',
      keyName: data,
      line: getEndLine(token),
    };
  }
}
