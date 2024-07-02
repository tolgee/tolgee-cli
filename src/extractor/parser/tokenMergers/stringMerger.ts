import { GeneralTokenType } from '../generalMapper.js';
import { MachineType } from '../mergerMachine.js';

export const enum S {
  Idle,
  RegularString,
  RegularStringEnd,
  TemplateString,
  TemplateStringEnd,
}

export const stringMerger = {
  initial: S.Idle,
  step: (state, token, end) => {
    const type = token.customType;
    switch (state) {
      case S.Idle:
        if (type === 'string.begin') {
          return S.RegularString;
        } else if (type === 'string.teplate.begin') {
          return S.TemplateString;
        }
        break;
      case S.RegularString:
        if (type === 'string.body') {
          return S.RegularStringEnd;
        } else if (type === 'string.end') {
          return end.MERGE_ALL;
        }
        break;
      case S.RegularStringEnd:
        if (type === 'string.end') {
          return end.MERGE_ALL;
        }
        break;
      case S.TemplateString:
        if (type === 'string.template.body') {
          return S.TemplateStringEnd;
        } else if (type === 'string.template.end') {
          return end.MERGE_ALL;
        }
        break;
      case S.TemplateStringEnd:
        if (type === 'string.template.end') {
          return end.MERGE_ALL;
        }
    }
  },
  customType: 'string',
  resultToken: (matched) => {
    if (matched.length === 3) {
      return matched[1].token;
    } else {
      return '';
    }
  },
} as const satisfies MachineType<GeneralTokenType, S>;
