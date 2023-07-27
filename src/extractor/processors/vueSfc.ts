// Vue SFC are a bit of a nightmare. :D
//
// 1: We need to extract the script setup, script and template blocks.
// 2: We need to resolve them if necessary (script src="" is allowed).
// 3: We need to define uses of `useTranslate` in setup script.
// 4: We finally can go through the template file.

import tokenizer, { type Token } from '../tokenizer.js';

function extractSfcTokens(tokens: Token[]) {
  return {
    setup: [],
    script: {
      provenance: null,
      tokens: [],
    },
    template: {
      provenance: null,
      tokens: [],
    },
  };
}

export default async function handleVueSfc(code: string, fileName: string) {
  const tokens = await tokenizer(code, fileName);
  const decoded = extractSfcTokens(tokens);
  return { warnings: [], keys: [] };
}
