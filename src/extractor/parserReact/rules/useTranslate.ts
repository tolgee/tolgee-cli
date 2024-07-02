import { tNsSourceGeneral } from '../../parser/rules/tNsSourceGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { ReactTokenType } from '../ParserReact.js';

export const useTranslate = {
  trigger: 'trigger.use.translate',
  call(context) {
    return tNsSourceGeneral(context);
  },
} satisfies RuleType<ReactTokenType>;
