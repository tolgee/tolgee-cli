import { ReactMappedTokenType } from '../../parserReact/ParserReact.js';
import { MachineType } from '../mergerMachine.js';

export const customTCallMerger = (customExpressions: string[]) => {
  return {
    initial: '',
    step: (state, t, end) => {
      const type = t.customType;
      const token = t.token;

      if (type === 'variable' || type === 'function.call') {
        if (customExpressions.find((e) => e.startsWith(state + token))) {
          return state + token;
        }
      } else if (type === 'acessor.dot') {
        return state + '.';
      } else if (state !== '' && type === 'expression.begin') {
        if (customExpressions.includes(state)) {
          return end.MERGE_ALL;
        }
      }
    },
    customType: 'trigger.global.t.function',
  } as const satisfies MachineType<ReactMappedTokenType, string>;
};
