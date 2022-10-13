import { debug } from '../utils/logger';
import { KEY_REGEX } from '../utils/constants';

export type ExtractorRegExp = {
  /** Code references that will be dynamically injected into the extractor via `$<key>$` */
  references?: Record<string, string | RegExp>;
  /** Regexes that'll be used to extract the strings. `%string%` must be present (internally: KEY_REGEX) */
  extraction: Array<string>;
};

export function validateRegExpExtractor(extractor: ExtractorRegExp) {
  // Validate references object
  if (typeof extractor.references !== 'undefined') {
    if (
      typeof extractor.references !== 'object' ||
      Array.isArray(extractor.references)
    )
      throw new TypeError(
        'Invalid RegExp extractor: `references` is not an object!'
      );

    for (const k in extractor.references) {
      if (k in extractor.references) {
        if (
          typeof extractor.references[k] !== 'string' &&
          (typeof extractor.references[k] !== 'object' ||
            !(extractor.references[k] instanceof RegExp))
        )
          throw new TypeError(
            `Invalid RegExp extractor: \`references.${k}\` is not a string or a RegExp!`
          );
      }
    }
  }

  // Validate extractor object
  if (
    typeof extractor.extraction !== 'object' ||
    !Array.isArray(extractor.extraction)
  ) {
    throw new TypeError(
      'Invalid RegExp extractor: `extraction` is not an array!'
    );
  }

  for (let i = 0; i < extractor.extraction.length; i++) {
    const extract = extractor.extraction[i];
    if (typeof extract !== 'string')
      throw new TypeError(
        `Invalid RegExp extractor: \`extraction[${i}]\` is not a string!`
      );
    if (!extract.includes('%string%'))
      throw new TypeError(
        `Invalid RegExp extractor: \`extraction[${i}]\` doesn't include %string%!`
      );
  }
}

function extractReferences(
  content: string,
  extractor: ExtractorRegExp
): Map<string, string[]> {
  const refs = new Map<string, string[]>();

  for (const refId in extractor.references) {
    if (refId in extractor.references) {
      const extractedRefs: string[] = [];
      const regex = new RegExp(extractor.references[refId], 'g');

      for (const match of content.matchAll(regex)) {
        extractedRefs.push(match[1]);
      }

      if (extractedRefs.length) {
        refs.set(refId, extractedRefs);
      }
    }
  }

  return refs;
}

function prepareRegexps(
  refs: Map<string, string[]>,
  extractor: ExtractorRegExp
): RegExp[] {
  const regexps: RegExp[] = [];
  const rawRegexps = [...extractor.extraction];
  const referenceRegex = /\$([a-zA-Z0-9_]+)\$/;

  for (const rawRegexp of rawRegexps) {
    const referenceMatch = rawRegexp.match(referenceRegex);
    if (referenceMatch) {
      if (refs.has(referenceMatch[1])) {
        for (const resolvedRef of refs.get(referenceMatch[1])!) {
          // Push regexp back to the queue
          rawRegexps.push(rawRegexp.replaceAll(referenceMatch[0], resolvedRef));
        }
      }

      // Abort processing here; RegExp has either been pushed back to the queue
      // or cannot be used as one of its references is unresolved.
      continue;
    }

    regexps.push(
      new RegExp(rawRegexp.replaceAll('%string%', `(${KEY_REGEX.source})`), 'g')
    );
  }

  return regexps;
}

export function regexpExtractorRunner(
  extractor: ExtractorRegExp,
  content: string
): string[] {
  // perf: deduplicating here is not necessary and would not be worth doing since an additional
  // dedupe would be necessary to remove dupes across different files. as such, let's use a plain array.
  const discoveredKeys = [];

  debug(`[RegExp Extractor] Extracting references`);
  const refs = extractReferences(content, extractor);

  debug(`[RegExp Extractor] Preparing extraction`);
  const regexps = prepareRegexps(refs, extractor);

  for (const regex of regexps) {
    const keys = content.matchAll(regex);
    for (const k of keys) discoveredKeys.push(k[1].trim());
  }

  return discoveredKeys;
}
