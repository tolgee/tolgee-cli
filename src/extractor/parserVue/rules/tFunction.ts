import { tFunctionGeneral } from '../../parser/rules/tFunctionGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { VueTokenType } from '../ParserVue.js';

export const tFunction = {
  trigger: 'trigger.t.function',
  call(context) {
    return tFunctionGeneral(context, true);
  },
} satisfies RuleType<VueTokenType>;
