import { GeneralTokenType } from '../../parser/generalMapper.js';
import { MachineType } from '../../parser/mergerMachine.js';

export enum S {
  Idle,
  ExpectBracket,
}

// getTranslate(
export const getTranslateMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (type === 'function.call' && token === 'getTranslate') {
          return S.ExpectBracket;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.get.translate',
} as const satisfies MachineType<GeneralTokenType, S>;
