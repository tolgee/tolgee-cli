import { MachineType } from '../../parser/mergerMachine.js';
import { VueMappedTokenType } from '../ParserVue.js';

export enum S {
  Idle,
  ExpectT,
}

// <T
export const tComponentMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (type === 'tag.regular.begin') {
          return S.ExpectT;
        }
        break;
      case S.ExpectT:
        if (type === 'tag.name' && token === 'T') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.t.component',
} as const satisfies MachineType<VueMappedTokenType, S>;
