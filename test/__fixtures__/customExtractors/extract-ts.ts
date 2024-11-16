import type { ExtractionResult, ExtractedKey } from '#cli/extractor/index.js';

export default function (code: string): ExtractionResult {
  // Very simple, trivial extractor for the purposes of testing
  const keys: ExtractedKey[] = [];
  const lines = code.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const [str] of lines[i].matchAll(/STR_[A-Z_]+/g)) {
      keys.push({ keyName: str, line: i + 1 });
    }
  }

  return {
    keys,
  };
}
