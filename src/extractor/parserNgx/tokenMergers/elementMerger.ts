import { MachineType } from '../../parser/mergerMachine.js';
import { NgxMappedTokenType } from '../ParserNgx.js';

export const enum S {
  Idle,
  ExpectT,
}

// <T
export const tComponentMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;

    switch (state) {
      case S.Idle:
        if (type === 'tag.regular.begin') {
          return S.ExpectT;
        }
        break;
      case S.ExpectT:
        if (type === 'tag.name') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.component',
} as const satisfies MachineType<NgxMappedTokenType, S>;
