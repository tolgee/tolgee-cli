// Vue SFC are a bit of a nightmare. :D
//
// 1: We need to extract the script setup, script and template blocks.
// 2: We need to resolve them if necessary (script src="" is allowed).
// 3: We need to define uses of `useTranslate` in setup script.
// 4: We finally can go through the template file.

import { interpret } from 'xstate';
import tokenizer, { type Token } from '../tokenizer.js';
import vueSfcDecoderMachine from '../machines/vue/decoder.js';
import vueSfcExtractorMachine from '../machines/vue/extract.js';

function extractSfcTokens(tokens: Token[]) {
  const machine = interpret(vueSfcDecoderMachine);

  machine.start();
  for (let i = 0; i < tokens.length; i++) {
    machine.send(tokens[i]);
  }

  const snapshot = machine.getSnapshot();
  return snapshot.context;
}

function sort(a: { line: number }, b: { line: number }) {
  if (a.line === b.line) return 0;
  if (a.line > b.line) return 1;
  return -1;
}

export default async function handleVueSfc(code: string, fileName: string) {
  const tokens = await tokenizer(code, fileName);
  const decoded = extractSfcTokens(tokens);

  const machine = interpret(vueSfcExtractorMachine);
  machine.start();

  machine.send({ type: 'SETUP' });
  for (let i = 0; i < decoded.setup.length; i++) {
    machine.send(decoded.setup[i]);
  }

  machine.send({ type: 'SCRIPT' });
  for (let i = 0; i < decoded.script.length; i++) {
    machine.send(decoded.script[i]);
  }

  machine.send({ type: 'TEMPLATE' });
  for (let i = 0; i < decoded.template.length; i++) {
    machine.send(decoded.template[i]);
  }

  const snapshot = machine.getSnapshot();
  const warnings = decoded.invalidSetup
    ? [
        ...snapshot.context.warnings,
        { warning: 'W_VUE_SETUP_IS_A_REFERENCE', line: decoded.invalidSetup },
      ]
    : snapshot.context.warnings;

  return {
    warnings: warnings.sort(sort),
    keys: snapshot.context.keys.sort(sort),
  };
}
