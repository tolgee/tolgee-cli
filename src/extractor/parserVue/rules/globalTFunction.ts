import { tFunctionGeneral } from '../../parser/rules/tFunctionGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { VueTokenType } from '../ParserVue.js';

export const globalTFunction = {
  trigger: 'trigger.global.t.function',
  call(context) {
    return tFunctionGeneral(context, false);
  },
} satisfies RuleType<VueTokenType>;
