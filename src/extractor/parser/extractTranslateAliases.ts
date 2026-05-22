/**
 * Pre-pass that detects which destructured names are bound to which
 * `useTranslate` / `getTranslate` namespace within a file.
 *
 * Recognises:
 *
 *   const { t } = useTranslate('ns')
 *   const { t, isLoading } = useTranslate('ns')
 *   const { t: tCommon } = useTranslate('ns')
 *   const t = await getTranslate('ns')           // unnamed binding
 *   const { t: tCommon } = useTranslate(NS.K)    // namespace resolved via constants
 *
 * Returns:
 *   - aliasMap:    alias-name -> resolved namespace literal
 *   - lineAliasMap: line number of the useTranslate call -> alias name,
 *                   used by the parser to tag the emitted nsInfo node so
 *                   the reporter can match it to the corresponding keyInfo.
 *
 * Multi-line declarations are supported. Property entries that aren't `t`
 * (or `t:` rename) are ignored, so a `{ isLoading, t }` pattern still
 * resolves correctly.
 *
 * If the namespace argument is an identifier or `NAME.PROP` member access,
 * it is resolved against the constants map produced by extractConstants.
 * Unresolvable namespaces are intentionally skipped, so the existing
 * dynamic-namespace warning still fires.
 */
const TRANSLATE_DESTRUCTURE_RE =
  /const\s+\{\s*([^}]*?)\s*\}\s*=\s*(?:await\s+)?(?:useTranslate|getTranslate)\s*\(\s*([\s\S]*?)\s*\)/g;

// `const t = await getTranslate('ns')` style — single binding, no destructure.
const TRANSLATE_SINGLE_RE =
  /const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:await\s+)?(?:useTranslate|getTranslate)\s*\(\s*([\s\S]*?)\s*\)/g;

const T_ENTRY_RE = /(?:^|,)\s*t(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*(?=,|$)/;

const STRING_ARG_RE = /^(['"`])((?:\\.|(?!\1)[^\\])*)\1$/;
const IDENTIFIER_ARG_RE = /^([A-Za-z_$][\w$]*)$/;
const MEMBER_ARG_RE = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/;

export type TranslateAliases = {
  aliasMap: Map<string, string>;
  lineAliasMap: Map<number, string>;
};

function resolveArg(
  rawArg: string,
  constants: Map<string, string>
): string | undefined {
  const trimmed = rawArg.trim();
  let m = STRING_ARG_RE.exec(trimmed);
  if (m) return m[2];
  m = MEMBER_ARG_RE.exec(trimmed);
  if (m) {
    const key = `${m[1]}.${m[2]}`;
    return constants.get(key);
  }
  m = IDENTIFIER_ARG_RE.exec(trimmed);
  if (m) {
    return constants.get(m[1]);
  }
  return undefined;
}

function lineNumberOf(code: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (code.charCodeAt(i) === 10 /* \n */) line += 1;
  }
  return line;
}

export function extractTranslateAliases(
  code: string,
  constants: Map<string, string>
): TranslateAliases {
  const aliasMap = new Map<string, string>();
  const lineAliasMap = new Map<number, string>();

  let match: RegExpExecArray | null;

  TRANSLATE_DESTRUCTURE_RE.lastIndex = 0;
  while ((match = TRANSLATE_DESTRUCTURE_RE.exec(code))) {
    const [, body, rawArg] = match;
    const ns = resolveArg(rawArg, constants);
    if (ns === undefined) continue;

    const entry = T_ENTRY_RE.exec(`,${body},`);
    if (!entry) continue;

    const alias = entry[1] ?? 't';
    aliasMap.set(alias, ns);
    // `useTranslate(` opens on the same line as the const declaration in
    // the vast majority of real code; align to the call-site line so the
    // parser's nsInfo (emitted at trigger.use.translate) matches.
    const callIndex = match.index + match[0].lastIndexOf('(');
    lineAliasMap.set(lineNumberOf(code, callIndex), alias);
  }

  TRANSLATE_SINGLE_RE.lastIndex = 0;
  while ((match = TRANSLATE_SINGLE_RE.exec(code))) {
    const [, alias, rawArg] = match;
    const ns = resolveArg(rawArg, constants);
    if (ns === undefined) continue;
    if (!aliasMap.has(alias)) {
      aliasMap.set(alias, ns);
      const callIndex = match.index + match[0].lastIndexOf('(');
      lineAliasMap.set(lineNumberOf(code, callIndex), alias);
    }
  }

  return { aliasMap, lineAliasMap };
}
