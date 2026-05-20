/**
 * Pre-pass over the source code that builds a map of top-level
 * `const NAME = 'literal'` (optionally with `as const`) bindings.
 *
 * The extractor walks tokens, not the TS AST, so it cannot natively resolve
 * an identifier passed to `useTranslate(NS)` or `<T ns={NS}>` back to its
 * declaration. This helper produces a small symbol table the parser
 * substitutes in when it sees a variable reference.
 *
 * Only declarations that initialise to a single string literal are recorded.
 * Anything dynamic (concatenation, function call, template with interpolation,
 * conditional expression, …) is intentionally skipped so the existing
 * dynamic-namespace warning still fires for those cases.
 */
const CONST_LITERAL_RE =
  /(?:^|[\n\r])[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*(?::[^=]*)?=[ \t]*(['"`])((?:\\.|(?!\2)[^\\\n\r])*)\2(?:[ \t]+as[ \t]+const)?[ \t]*;?/g;

export function extractConstants(code: string): Map<string, string> {
  const result = new Map<string, string>();
  let match: RegExpExecArray | null;
  CONST_LITERAL_RE.lastIndex = 0;
  while ((match = CONST_LITERAL_RE.exec(code))) {
    const [, name, , value] = match;
    // First declaration wins; duplicate declarations are a TS error anyway.
    if (!result.has(name)) {
      result.set(name, value);
    }
  }
  return result;
}
