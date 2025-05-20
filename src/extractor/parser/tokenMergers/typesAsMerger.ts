import { MachineType } from '../mergerMachine.js';
import { ReactMappedTokenType } from '../../parserReact/ParserReact.js';

const INITIAL_DEPTH = -1;

// in ts files we want to ignore stuff after 'as' `[count as number]`
export const typesAsMerger = {
  initial: INITIAL_DEPTH,
  step: (depth, token, end) => {
    const type = token.customType;
    if (depth === INITIAL_DEPTH) {
      if (type === 'typescript.as') {
        return 0;
      }
    } else if (depth === 0) {
      // anything unexpected will end the ignoring
      switch (type) {
        case 'typescript.expr.begin':
        case 'expression.begin':
          return depth + 1;
        case 'typescript.type.primitive':
        case 'typescript.operator':
          return depth;
        default:
          return end.MERGE_WITHOUT_LAST;
      }
    } else if (depth > 0) {
      // we are deeply nested, ignore everything
      switch (type) {
        case 'typescript.expr.begin':
        case 'expression.begin':
          return depth + 1;
        case 'typescript.expr.end':
        case 'expression.end':
          return depth - 1;
        default:
          return depth;
      }
    }
  },
  customType: 'ignore',
} as const satisfies MachineType<ReactMappedTokenType, number>;
