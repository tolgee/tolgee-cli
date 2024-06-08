import { MachineType } from '../mergerMachine.js';
import { ReactMappedTokenType } from '../../parserReact/ParserReact.js';

export enum S {
  Idle,
  ExpectName,
  ExpectEnd,
}

export const closingTagMerger = {
  initial: S.Idle,
  step: (state, token, end) => {
    const type = token.customType;
    switch (state) {
      case S.Idle:
        if (type === 'tag.closing.begin') {
          return S.ExpectName;
        }
        break;
      case S.ExpectName:
        if (type === 'tag.name') {
          return S.ExpectEnd;
        }
        break;
      case S.ExpectEnd:
        if (type === 'tag.regular.end') {
          return end.MERGE_ALL;
        }
        break;
    }
  },
  customType: 'tag.closing',
  resultToken: (matched) => {
    return matched[1].token;
  },
} as const satisfies MachineType<ReactMappedTokenType, S>;
