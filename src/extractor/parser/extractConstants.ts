/**
 * Pre-pass over the source code that builds a flat map of top-level constant
 * string bindings.
 *
 * Two declaration shapes are recognised:
 *
 *   const NAME = 'literal'
 *   const NAME = 'literal' as const
 *
 * and (flat) string-valued object literals:
 *
 *   const NS = { KEY1: 'literal1', KEY2: 'literal2' } as const
 *   const NS = { KEY1: 'literal1', KEY2: 'literal2' }
 *
 * Object literals are flattened, so the second example produces entries
 * `NS.KEY1 → 'literal1'` and `NS.KEY2 → 'literal2'`. Nested objects are
 * intentionally skipped (the existing dynamic-namespace warning still
 * fires for those).
 *
 * The extractor walks tokens, not the TS AST, so it cannot natively
 * resolve an identifier passed to `useTranslate(NS)` or `<T ns={NS.X}>`
 * back to its declaration. This helper produces a small symbol table
 * the parser substitutes in when it sees a variable reference.
 */
const CONST_LITERAL_RE =
  /(?:^|[\n\r])[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*(?::[^=]*)?=[ \t]*(['"`])((?:\\.|(?!\2)[^\\\n\r])*)\2(?:[ \t]+as[ \t]+const)?[ \t]*;?/g;

// Only matches object literals without nested braces. That's enough for the
// `const NS = { ... } as const` pattern and keeps the regex tractable.
const CONST_OBJECT_RE =
  /(?:^|[\n\r])[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*(?::[^=]*)?=[ \t]*\{([^{}]*)\}(?:[ \t]+as[ \t]+const)?[ \t]*;?/g;

const OBJECT_PROPERTY_RE =
  /(?:^|[,{\s])([A-Za-z_$][\w$]*)[ \t]*:[ \t]*(['"`])((?:\\.|(?!\2)[^\\\n\r])*)\2/g;

export function extractConstants(code: string): Map<string, string> {
  const result = new Map<string, string>();

  let match: RegExpExecArray | null;

  CONST_LITERAL_RE.lastIndex = 0;
  while ((match = CONST_LITERAL_RE.exec(code))) {
    const [, name, , value] = match;
    if (!result.has(name)) {
      result.set(name, value);
    }
  }

  CONST_OBJECT_RE.lastIndex = 0;
  while ((match = CONST_OBJECT_RE.exec(code))) {
    const [, objectName, body] = match;
    OBJECT_PROPERTY_RE.lastIndex = 0;
    let propMatch: RegExpExecArray | null;
    while ((propMatch = OBJECT_PROPERTY_RE.exec(body))) {
      const [, propName, , propValue] = propMatch;
      const key = `${objectName}.${propName}`;
      if (!result.has(key)) {
        result.set(key, propValue);
      }
    }
  }

  return result;
}
