import { parseTag } from '../../parser/tree/parseTag.js';
import { ExpressionNode, RuleType } from '../../parser/types.js';
import type { VueTokenType } from '../ParserVue.js';
import { VUE_SCRIPT_REGULAR, VUE_SCRIPT_SETUP } from '../contextConstants.js';

// <script setup>....</script>
// ^^^^^^^-----------^^^^^^^^^
export const scriptTag = {
  trigger: 'trigger.script.tag',
  call(context) {
    const line = context.getCurrentLine();
    const { props, child } = parseTag(context);
    const result: ExpressionNode = {
      type: 'expr',
      line,
      values: [props],
    };

    if (child) {
      if (child.type === 'expr') {
        result.values.push(...child.values);
      } else {
        result.values.push(child);
      }
    }

    if (props.type === 'dict' && Boolean(props.value['setup'])) {
      result.context = VUE_SCRIPT_SETUP;
    } else {
      result.context = VUE_SCRIPT_REGULAR;
    }
    return result;
  },
} satisfies RuleType<VueTokenType>;
