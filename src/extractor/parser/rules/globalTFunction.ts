import { tFunctionGeneral } from './tFunctionGeneral.js';
import { RuleType } from '../types.js';
import { GeneralTokenType } from '../generalMapper.js';

export const globalTFunction = {
  trigger: 'trigger.global.t.function',
  call(context) {
    return tFunctionGeneral(context, false);
  },
} satisfies RuleType<GeneralTokenType> as any;
