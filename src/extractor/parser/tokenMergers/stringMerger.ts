import { GeneralTokenType } from '../generalMapper.js';
import { MachineType } from '../mergerMachine.js';

export const enum S {
  Idle,
  RegularString,
  TemplateString,
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
          return S.RegularString;
        } else if (type === 'escaped.character') {
          return S.RegularString;
        } else if (type === 'string.end') {
          return end.MERGE_ALL;
        }
        break;
      case S.TemplateString:
        if (type === 'string.template.body') {
          return S.TemplateString;
        } else if (type === 'escaped.character') {
          return S.TemplateString;
        } else if (type === 'string.template.end') {
          return end.MERGE_ALL;
        }
        break;
    }
  },
  customType: 'string',
  resultToken: (matched) => {
    return matched
      .map((t) => {
        switch (t.customType) {
          case 'string.template.body':
          case 'string.body':
            return t.token;
          case 'escaped.character':
            if (t.token === "\\'") {
              return "'";
            }
            // interpret escape character
            try {
              return JSON.parse(`"${t.token}"`);
            } catch (e) {
              return t.token;
            }
          default:
            return '';
        }
      })
      .join('');
  },
} as const satisfies MachineType<GeneralTokenType, S>;
