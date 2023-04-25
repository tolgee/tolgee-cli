import { extname } from 'path';
import { interpret } from 'xstate';
import reactExtractorMachine from './machines/react.js';
import svelteExtractorMachine from './machines/svelte.js';
import commentsExtractorMachine from './machines/comments.js';
import tokenizer from './tokenizer.js';

const REACT_EXTS = [
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.jsx',
  '.tsx',
];
const ALL_EXTS = [
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.jsx',
  '.tsx',
  '.svelte',
];

function pickMachine(code: string, fileName: string) {
  const ext = extname(fileName);

  if (REACT_EXTS.includes(ext) && code.includes('@tolgee/react')) {
    return reactExtractorMachine;
  }

  if (ext === '.svelte' && code.includes('@tolgee/svelte')) {
    return svelteExtractorMachine;
  }

  if (
    ALL_EXTS.includes(ext) &&
    (code.includes('@tolgee-key') || code.includes('@tolgee-ignore'))
  ) {
    return commentsExtractorMachine;
  }

  return null;
}

export default async function extractor(code: string, fileName: string) {
  const machineSpec = pickMachine(code, fileName);
  if (!machineSpec) {
    return { warnings: [], keys: [] };
  }

  const tokens = await tokenizer(code, fileName);
  // @ts-ignore -- Types are whacky, complains about withConfig but it's not a problem here.
  const machine = interpret(machineSpec);

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
