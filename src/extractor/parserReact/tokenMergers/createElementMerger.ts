import { GeneralTokenType } from '../../parser/generalMapper.js';
import { MachineType } from '../../parser/mergerMachine.js';

export enum S {
  Idle,
  ExpectDot,
  ExpectCall,
  ExpectBracket,
  ExpectT,
  ExpectComma,
}

// React.createElement(T,
export const createElementMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (type === 'variable' && token === 'React') {
          return S.ExpectDot;
        }
        break;
      case S.ExpectDot:
        if (type === 'acessor.dot') {
          return S.ExpectCall;
        }
        break;
      case S.ExpectCall:
        if (type === 'function.call') {
          return S.ExpectBracket;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return S.ExpectT;
        }
        break;
      case S.ExpectT:
        if (type === 'variable' && token === 'T') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.react.create.t.element',
} as const satisfies MachineType<GeneralTokenType, S>;
