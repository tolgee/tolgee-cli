import { MachineType } from '../../parser/mergerMachine.js';
import { NgxMappedTokenType } from '../ParserNgx.js';

export const enum S {
  Idle,
  ExpectTranslate,
}

// <div ... t
export const pipeMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;

    switch (state) {
      case S.Idle:
        if (type === 'operator.logical') {
          return S.ExpectTranslate;
        }
        break;

      case S.ExpectTranslate:
        if (type === 'function.call.pipe' && t.token === 'translate') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.translate.pipe',
} as const satisfies MachineType<NgxMappedTokenType, S>;
