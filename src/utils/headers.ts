// RFC 7230 token grammar for header field names.
const HEADER_NAME_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

// True if the string contains an ASCII control character forbidden in a header
// field value. Per RFC 7230 a field value may contain HTAB (0x09), so only the
// other C0 controls (which include CR and LF, the injection vectors) and DEL
// are rejected.
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code < 0x20 && code !== 0x09) || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function validateHeaderName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('header name must not be empty');
  }
  if (!HEADER_NAME_TOKEN.test(trimmed)) {
    throw new Error(`invalid header name "${name}"`);
  }
}

export function validateHeaderValue(value: string): void {
  if (hasControlChar(value)) {
    throw new Error('header value must not contain control characters');
  }
}

export function normalizeHeaderKeys(
  headers: Record<string, string> | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    out[normalizeHeaderName(name)] = value;
  }
  return out;
}

/**
 * Parses a list of raw `Name: Value` header strings (e.g. from repeated
 * `--extra-header` flags) into a name->value map. Names are lowercased; later
 * entries override earlier ones. Throws on a missing colon, an empty/invalid
 * name, or control characters. Empty values are allowed.
 */
export function parseHeaderList(
  list: string[] | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of list ?? []) {
    const separator = entry.indexOf(':');
    if (separator === -1) {
      throw new Error(`invalid header "${entry}", expected "Name: Value"`);
    }
    const name = entry.slice(0, separator);
    const rawValue = entry.slice(separator + 1);
    validateHeaderName(name);
    validateHeaderValue(rawValue);
    out[normalizeHeaderName(name)] = rawValue.trim();
  }
  return out;
}

/**
 * Merges config-file headers with CLI `--extra-header` values into a single
 * name->value map. CLI values override config values for the same (lowercased)
 * name.
 */
export function mergeHeaders(
  configHeaders: Record<string, string> | undefined,
  extraHeaderList: string[] | undefined
): Record<string, string> {
  return {
    ...normalizeHeaderKeys(configHeaders),
    ...parseHeaderList(extraHeaderList),
  };
}
