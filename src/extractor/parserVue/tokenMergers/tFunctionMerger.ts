import { GeneralTokenType } from '../../parser/generalMapper.js';
import { MachineType } from '../../parser/mergerMachine.js';

export enum S {
  Idle,
  ExpectDot,
  ExpectValueMethod,
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
        } else if (type === 'variable' && token === 't') {
          return S.ExpectDot;
        } else if (type === 'acessor.dot') {
          return S.Ignore;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return end.MERGE_ALL;
        }
        break;
      case S.ExpectDot:
        if (type === 'acessor.dot') {
          return S.ExpectValueMethod;
        }
        break;
      case S.ExpectValueMethod:
        if (type === 'function.call') {
          return S.ExpectBracket;
        }
        break;
    }
  },
  customType: 'trigger.t.function',
} as const satisfies MachineType<GeneralTokenType, S>;
