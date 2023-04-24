import { extname } from 'path';
import { interpret } from 'xstate';
import svelteExtractorMachine from '../machines/svelte';
import tokenizer from '../tokenizer';

export default async function (code: string, fileName: string) {
  if (extname(fileName) !== '.svelte') {
    // File is not a file that contains keys
    return { warnings: [], keys: [] };
  }

  const tokens = await tokenizer(code, fileName);
  const machine = interpret(svelteExtractorMachine);

  machine.start();
  for (const token of tokens) {
    machine.send(token);
  }

  const snapshot = machine.getSnapshot();
  return {
    warnings: snapshot.context.warnings,
    keys: snapshot.context.keys,
  };
}
