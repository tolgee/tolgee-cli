import { MachineType } from '../../parser/mergerMachine.js';
import { NgxMappedTokenType } from '../ParserNgx.js';

export const enum S {
  Idle,
  ExpectPipe,
  ExpectTranslate,
}

// <div ... t
export const pipeMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;

    switch (state) {
      case S.Idle:
        if (type === 'expression.template.begin') {
          return S.ExpectPipe;
        }
        break;
      case S.ExpectPipe:
        if (type === 'expression.template.end') {
          return undefined;
        } else if (type === 'operator.logical') {
          return S.ExpectTranslate;
        }
        return S.ExpectPipe;

      case S.ExpectTranslate:
        if (type === 'function.call.pipe' && t.token === 'translate') {
          return end.REPLACE_FIRST;
        }
    }
  },
  customType: 'trigger.translate.pipe',
} as const satisfies MachineType<NgxMappedTokenType, S>;
