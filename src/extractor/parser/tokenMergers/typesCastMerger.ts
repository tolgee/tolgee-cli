import { MachineType } from '../mergerMachine.js';
import { ReactMappedTokenType } from '../../parserReact/ParserReact.js';

const INITIAL_DEPTH = 0;

// in ts files we wan to ignore type casting (<number> count)
export const typesCastMergerer = {
  initial: INITIAL_DEPTH,
  step: (depth, token, end) => {
    const type = token.customType;
    if (depth === INITIAL_DEPTH) {
      if (type === 'typescript.expr.begin') {
        return 1;
      }
    } else if (depth > 0) {
      if (type === 'typescript.expr.end' && depth === 1) {
        return end.MERGE_ALL;
      } else if (type === 'typescript.expr.end') {
        return depth - 1;
      } else if (type === 'typescript.expr.begin') {
        return depth + 1;
      } else {
        return depth;
      }
    }
  },
  customType: 'ignore',
} as const satisfies MachineType<ReactMappedTokenType, number>;
