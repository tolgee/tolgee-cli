import { GeneralTokenType } from '../../parser/generalMapper.js';
import { parseTag } from '../../parser/tree/parseTag.js';
import {
  ArrayNode,
  KeyInfoNode,
  ParserContext,
  RuleType,
} from '../../parser/types.js';
import type { NgxTokenType } from '../ParserNgx.js';

// <T keyName="test">Default</T>
// ^^-----------------------^^^^
export const generalComponent = {
  trigger: 'trigger.component',
  call(context) {
    const { getCurrentLine } = context as ParserContext<GeneralTokenType>;
    const line = getCurrentLine();
    const { props, child } = parseTag(context);

    if (props.type !== 'dict' || !props.value['t']) {
      const result: ArrayNode = { type: 'array', line, values: [props] };
      if (child) {
        result.values.push(child);
      }
      return result;
    } else {
      const result: KeyInfoNode = {
        type: 'keyInfo',
        line,
        dependsOnContext: false,
        values: [],
      };
      for (const [key, value] of Object.entries(props.value)) {
        switch (key) {
          case 'key':
            result.keyName = value;
            break;
          case 'defaultValue':
            result.defaultValue = value;
            break;
          case 'ns':
            result.namespace = value;
            break;
          default:
            result.values.push(value);
        }
      }
      return result;
    }
  },
} satisfies RuleType<NgxTokenType>;
