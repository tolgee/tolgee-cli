import { tNsSourceGeneral } from '../../parser/rules/tNsSourceGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { SvelteTokenType } from '../ParserSvelte.js';

export const getTranslate = {
  trigger: 'trigger.get.translate',
  call(context) {
    return tNsSourceGeneral(context);
  },
} satisfies RuleType<SvelteTokenType>;
