import { tNsSourceGeneral } from '../../parser/rules/tNsSourceGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { VueTokenType } from '../ParserVue.js';

export const useTranslate = {
  trigger: 'trigger.use.translate',
  call(context) {
    return tNsSourceGeneral(context);
  },
} satisfies RuleType<VueTokenType>;
