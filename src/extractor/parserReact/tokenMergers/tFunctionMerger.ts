import { GeneralTokenType } from '../../parser/generalMapper.js';
import { MachineType } from '../../parser/mergerMachine.js';

export const enum S {
  Idle,
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
        if (type === 'function.call' && token === 't') {
          return S.ExpectBracket;
        } else if (type === 'acessor.dot') {
          return S.Ignore;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.t.function',
} as const satisfies MachineType<GeneralTokenType, S>;
