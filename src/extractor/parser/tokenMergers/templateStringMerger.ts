import { MachineType } from '../mergerMachine.js';
import { ReactMappedTokenType } from '../../parserReact/ParserReact.js';

export const enum S {
  Idle,
  Merging,
  ExpectingExpression,
  ExpectingEndBrace,
}

export const templateStringMerger = {
  initial: S.Idle,
  step: (state, token, end) => {
    const type = token.customType;
    switch (state) {
      case S.Idle:
        if (type === 'string.template') {
          return S.Merging;
        } else if (type === 'expression.template.begin') {
          return S.ExpectingExpression;
        }
        break;
      case S.Merging:
        if (type === 'string.template') {
          return S.Merging;
        } else if (type === 'expression.template.begin') {
          return S.ExpectingExpression;
        } else {
          return end.MERGE_WITHOUT_LAST;
        }
      case S.ExpectingExpression:
        if (type === 'string') {
          return S.ExpectingEndBrace;
        }
        break;
      case S.ExpectingEndBrace:
        if (type === 'expression.template.end') {
          return S.Merging;
        }
        break;
    }
  },
  customType: 'string',
  resultToken: (matched) => {
    const result: string[] = [];
    for (const token of matched) {
      if (token.customType === 'string.template') {
        // Match and remove leading whitespace except for newlines
        let value = token.token.replace(/^[^\S\n]+/gm, '');

        // Match and remove trailing whitespace except for newlines
        value = value.replace(/[^\S\n]+$/gm, '');

        // replace multiple newlines with one space
        value = value.replace(/[\n]+/gm, ' ');

        result.push(value);
      } else if (token.customType === 'string') {
        result.push(token.token);
      }
    }

    return result.join('').trim();
  },
} as const satisfies MachineType<ReactMappedTokenType, S>;
