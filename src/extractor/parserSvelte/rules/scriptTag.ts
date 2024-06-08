import { parseTag } from '../../parser/tree/parseTag.js';
import { ExpressionNode, RuleType } from '../../parser/types.js';
import { SvelteTokenType } from '../ParserSvelte.js';
import { SVELTE_SCRIPT } from '../contextConstants.js';

// <script ...>....</script>
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

    result.context = SVELTE_SCRIPT;
    return result;
  },
} satisfies RuleType<SvelteTokenType>;
