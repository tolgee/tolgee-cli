import { MachineType } from '../../parser/mergerMachine.js';
import { VueMappedTokenType } from '../ParserVue.js';

export enum S {
  Idle,
  ExpectTemplate,
}

// <script
export const scriptTagMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;
    const token = t.token;

    switch (state) {
      case S.Idle:
        if (type === 'tag.regular.begin') {
          return S.ExpectTemplate;
        }
        break;
      case S.ExpectTemplate:
        if (type === 'tag.name' && token === 'script') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'trigger.script.tag',
} as const satisfies MachineType<VueMappedTokenType, S>;
