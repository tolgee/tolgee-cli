import { GeneralTokenType } from '../generalMapper.js';
import { MachineType } from '../mergerMachine.js';

enum S {
  Idle,
  CommentStart,
  CommentBlock,
}

export const commentsMerger = {
  initial: S.Idle,
  step: (state, token, end) => {
    const type = token.customType;
    switch (state) {
      case S.Idle:
        if (type === 'comment.definition') {
          return S.CommentStart;
        }
        break;

      case S.CommentStart:
        if (type === 'comment.line') {
          return end.MERGE_ALL;
        } else if (type === 'comment.block') {
          return S.CommentBlock;
        }
        break;

      case S.CommentBlock:
        if (type === 'comment.block' || token.token === '\n') {
          return S.CommentBlock;
        } else if (type === 'comment.definition') {
          return end.MERGE_ALL;
        }
        break;
    }
  },
  resultToken: (matched) => {
    return matched
      .filter((t) => t.customType && t.customType !== 'comment.definition')
      .map((t) => t.token)
      .join('');
  },
  customType: 'comment',
} as const satisfies MachineType<GeneralTokenType, S>;
