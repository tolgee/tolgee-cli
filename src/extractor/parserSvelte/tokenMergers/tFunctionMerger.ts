import { MachineType } from '../../parser/mergerMachine.js';
import { SvelteMappedTokenType } from '../ParserSvelte.js';

export enum S {
  Idle,
  ExpectT,
  ExpectBracket,
  Ignore,
}

// t(
export const tFunctionMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (type === 'store.accessor.svelte' && token === '$') {
          return S.ExpectT;
        } else if (type === 'acessor.dot') {
          return S.Ignore;
        }
        break;
      case S.ExpectT:
        if (type === 'function.call' && token === 't') {
          return S.ExpectBracket;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return end.MERGE_ALL;
        }
        break;
    }
  },
  customType: 'trigger.t.function',
} as const satisfies MachineType<SvelteMappedTokenType, S>;
