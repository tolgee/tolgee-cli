import { extname } from 'path';
import { interpret } from 'xstate';
import reactExtractorMachine from '../machines/react';
import tokenizer from '../tokenizer';

const EXTS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'];

const TOLGEE_REACT_PKG_RE = /["'`]@tolgee\/react["'`]/;

export default async function (code: string, fileName: string) {
  if (!EXTS.includes(extname(fileName)) || !TOLGEE_REACT_PKG_RE.test(code)) {
    // File is not a file that contains keys
    return { warnings: [], keys: [] };
  }

  const tokens = await tokenizer(code, fileName);
  const machine = interpret(reactExtractorMachine);

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
