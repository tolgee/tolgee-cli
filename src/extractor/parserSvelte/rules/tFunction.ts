import { tFunctionGeneral } from '../../parser/rules/tFunctionGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { SvelteTokenType } from '../ParserSvelte.js';

export const tFunction = {
  trigger: 'trigger.t.function',
  call(context) {
    return tFunctionGeneral(context, true);
  },
} satisfies RuleType<SvelteTokenType>;
