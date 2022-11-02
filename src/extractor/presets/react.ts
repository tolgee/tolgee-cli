import { interpret } from 'xstate';
import reactExtractorMachine from '../machines/react';
import tokenizer from '../tokenizer';

type Key = { keyName: string; defaultValue?: string; namespace?: string };

export default async function (code: string, fileName: string) {
  const tokens = await tokenizer(code, fileName);
  const machine = interpret(reactExtractorMachine);

  machine.start();
  for (const token of tokens) {
    machine.send(token);
  }

  const snapshot = machine.getSnapshot();
  return snapshot.context.keys;
}
