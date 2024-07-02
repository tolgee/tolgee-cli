import { parseObject } from '../../parser/tree/parseObject.js';
import { RuleType } from '../../parser/types.js';
import type { VueTokenType } from '../ParserVue.js';
import { VUE_COMPONENT_CONFIG } from '../contextConstants.js';

// export default { setup() { .... } }
// ^^^^^^^^^^^^^^^^------------------^
export const exportDefaultObject = {
  trigger: 'trigger.export.default.object',
  call(context) {
    const result = parseObject(context);
    if (result.type === 'dict' && result.value['setup']) {
      result.context = VUE_COMPONENT_CONFIG;
    }
    return result;
  },
} satisfies RuleType<VueTokenType>;
