import { MachineType } from '../../parser/mergerMachine.js';
import { VueMappedTokenType } from '../ParserVue.js';

export const enum S {
  Idle,
  ExpectDefault,
  ExpectBlockStart,
}

// export default {
export const exportDefaultObjectMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;

    switch (state) {
      case S.Idle:
        if (type === 'keyword.export') {
          return S.ExpectDefault;
        }
        break;
      case S.ExpectDefault:
        if (type === 'keyword.default') {
          return S.ExpectBlockStart;
        }
        break;
      case S.ExpectBlockStart:
        if (type === 'block.begin') {
          return end.MERGE_ALL;
        }
        break;
    }
  },
  customType: 'trigger.export.default.object',
} as const satisfies MachineType<VueMappedTokenType, S>;
