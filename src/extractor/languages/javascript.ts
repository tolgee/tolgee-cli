const WHITESPACE = [' ', '\t', '\r', '\n', '\f', '\v'];
const STRING_QUOTES = ["'", '"', '`'];
const CONSUMABLE_MAP: Record<string, string> = {
  "'": "'",
  '"': '"',
  '`': '`',
  '{': '}',
  '[': ']',
  '(': ')',
};

type Result<T> = {
  extracted: T;
  consumed: number;
};

export function extractString(stringCode: string): string | null {
  stringCode = stringCode.trim();
  const concatRegex = new RegExp(`(?!\\\\).${stringCode[0]}\\s*\\+`);
  if (
    (stringCode.startsWith('`') && stringCode.match(/(?!\\).\${.*?}/)) ||
    stringCode.match(concatRegex)
  ) {
    // Dynamic string
    return null;
  }

  if (stringCode[0] !== stringCode[stringCode.length - 1]) {
    return null;
  }

  return stringCode.slice(1, -1).replaceAll('\\', '');
}

function extractKeyName(key: string): string {
  let decodedKey = key;
  if (decodedKey.startsWith('[')) {
    if (!STRING_QUOTES.includes(decodedKey[1])) return key;
    decodedKey = decodedKey.slice(1, -1);
  }

  if (!STRING_QUOTES.includes(decodedKey[0])) {
    return key;
  }

  return extractString(decodedKey) ?? key;
}

export function isConsumable(code: string) {
  return code[0] in CONSUMABLE_MAP;
}

export function greedilyConsumeBlock(code: string) {
  if (!isConsumable(code)) {
    throw new Error('Invalid input: not an consumable code string');
  }

  let depth = 1;
  let consumed = code[0];
  let idx = 1; // Skip initial token

  const start = code[0];
  const end = CONSUMABLE_MAP[start];
  while (depth && idx < code.length) {
    const token = code[idx++];
    // If token is escaped, don't update current depth
    if (code[idx - 2] !== '\\') {
      if (token === end) {
        depth--;
      } else if (token === start) {
        depth++;
      }
    }

    consumed += token;
  }

  if (depth) {
    throw new Error('Unexpected end of input');
  }

  return consumed;
}

export function extractObject(
  objectCode: string
): Result<Record<string, string>> {
  if (objectCode[0] !== '{') {
    throw new Error('Invalid input: not an object code string');
  }

  const extracted: Record<string, string> = {};
  let consumedKey = '';
  let consumed = '';
  let token = '';
  let idx = 1; // Skip initial token
  while (idx < objectCode.length && token !== '}') {
    token = objectCode[idx++];

    // Greedily consume
    if (token in CONSUMABLE_MAP) {
      const remainingCode = objectCode.slice(--idx);
      const greedilyConsumed = greedilyConsumeBlock(remainingCode);
      consumed += greedilyConsumed;
      idx += greedilyConsumed.length;
      continue;
    }

    // If we haven't consumed anything yet, consume and skip
    if (!consumed) {
      // Don't waste time consuming whitespace
      if (!WHITESPACE.includes(token)) consumed += token;
      continue;
    }

    // Check progress
    const isEndOfKey = token === ':';
    const isEndOfValue = token === ',';
    const isEndOfObject = token === '}';
    const keyConsumed = isEndOfKey || isEndOfValue || isEndOfObject;
    const valueConsumed = isEndOfValue || isEndOfObject;

    // If the value has been consumed, store it to the output object
    // Checking value first to handle declaration shortcuts ({ key1, key2: 2 })
    if (valueConsumed) {
      const value = consumed.trim();
      const key = consumedKey || value;
      extracted[extractKeyName(key)] = value;

      consumedKey = '';
      consumed = '';
      continue;
    }

    // If the key has been consumed, store it
    // We'll then start consuming the value
    if (keyConsumed) {
      consumedKey = consumed.trim();
      consumed = '';
      continue;
    }

    // Consume
    consumed += token;
  }

  if (idx === objectCode.length && objectCode[idx - 1] !== '}') {
    throw new Error('Unexpected end of input');
  }

  return {
    extracted: extracted,
    consumed: idx,
  };
}
