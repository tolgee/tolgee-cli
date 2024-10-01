import { tFunctionGeneral } from '../../parser/rules/tFunctionGeneral.js';
import { RuleType } from '../../parser/types.js';
import type { NgxTokenType } from '../ParserNgx.js';

export const translateFunction = {
  trigger: 'trigger.translate.function',
  call(context) {
    return tFunctionGeneral(context, false);
  },
} satisfies RuleType<NgxTokenType>;
