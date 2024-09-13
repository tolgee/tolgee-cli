import { MachineType } from '../../parser/mergerMachine.js';
import { NgxMappedTokenType } from '../ParserNgx.js';

export const enum S {
  Idle,
  ExpectName,
  ExpectTParam,
}

// <div ... t
export const componentWithTMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;

    switch (state) {
      case S.Idle:
        if (type === 'tag.regular.begin') {
          return S.ExpectName;
        }
        break;
      case S.ExpectName:
        if (type === 'tag.name') {
          return S.ExpectTParam;
        }
        break;
      case S.ExpectTParam:
        if (type === 'tag.attribute.name' && t.token === 't') {
          return end.REPLACE_FIRST;
        } else if (
          type === 'tag.self-closing.end' ||
          type === 'tag.regular.end'
        ) {
          return undefined;
        }
        return S.ExpectTParam;
    }
  },
  customType: 'trigger.component.with.t',
} as const satisfies MachineType<NgxMappedTokenType, S>;
