// Vue SFC are a bit of a nightmare. :D
//
// 1: We need to extract the script setup, script and template blocks.
// 2: We need to resolve them if necessary (script src="" is allowed).
// 3: We need to define uses of `useTranslate` in setup script.
// 4: We finally can go through the template file.

import { interpret } from 'xstate';
import tokenizer, { type Token } from '../tokenizer.js';
import vueSfcDecoderMachine from '../machines/vue/decoder.js';

function extractSfcTokens(tokens: Token[]) {
  const machine = interpret(vueSfcDecoderMachine);
  for (let i = 0; i < tokens.length; i++) {
    machine.send(tokens[i]);
  }

  const snapshot = machine.getSnapshot();
  return snapshot.context;
}

export default async function handleVueSfc(code: string, fileName: string) {
  const tokens = await tokenizer(code, fileName);
  const decoded = extractSfcTokens(tokens);
  return { warnings: [], keys: [] };
}
