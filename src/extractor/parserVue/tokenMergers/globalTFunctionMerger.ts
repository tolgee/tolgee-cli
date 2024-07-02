import { GeneralTokenType } from '../../parser/generalMapper.js';
import { MachineType } from '../../parser/mergerMachine.js';

export const enum S {
  Idle,
  ExpectBracket,
  ExpectDot,
  ExpectCall,
  Ignore,
}

// $t(
export const globalTFunctionMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (type === 'function.call' && token === '$t') {
          return S.ExpectBracket;
        } else if (type === 'variable' && token === 'this') {
          return S.ExpectDot;
        } else if (type === 'acessor.dot') {
          return S.Ignore;
        }
        break;
      case S.ExpectDot:
        if (type === 'acessor.dot') {
          return S.ExpectCall;
        }
        break;
      case S.ExpectCall:
        if (type === 'function.call' && token === '$t') {
          return S.ExpectBracket;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.global.t.function',
} as const satisfies MachineType<GeneralTokenType, S>;
