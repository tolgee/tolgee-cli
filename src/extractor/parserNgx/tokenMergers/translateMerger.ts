import { GeneralTokenType } from '../../parser/generalMapper.js';
import { MachineType } from '../../parser/mergerMachine.js';

const SERVICE_NAME_POSSIBILITIES = ['translateService'];

const TRANSLATE_FUNCTION_NAMES = ['translate', 'instant', 'get'];

export const enum S {
  Idle,
  ExpectBracket,
  ExpectDot,
  ExpectCall,
  Ignore,
}

// translateService.translate('key1', 'default-1', { ns: 'ns-1' })
export const translateMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (
          ['variable', 'function.call.pipe'].includes(type!) &&
          SERVICE_NAME_POSSIBILITIES.includes(token)
        ) {
          return S.ExpectDot;
        }
        break;
      case S.ExpectDot:
        if (type === 'acessor.dot') {
          return S.ExpectCall;
        }
        break;
      case S.ExpectCall:
        if (
          type === 'function.call' &&
          TRANSLATE_FUNCTION_NAMES.includes(token)
        ) {
          return S.ExpectBracket;
        }
        break;
      case S.ExpectBracket:
        if (type === 'expression.begin') {
          return end.MERGE_CUSTOM;
        }
    }
  },
  customType: 'trigger.translate.function',
  customMerge(tokens) {
    return {
      before: tokens.slice(0, -2),
      toMerge: tokens.slice(-2),
      after: [],
    };
  },
} as const satisfies MachineType<GeneralTokenType, S>;
