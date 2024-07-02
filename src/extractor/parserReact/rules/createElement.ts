import { parseList } from '../../parser/tree/parseList.js';
import { GeneralNode, KeyInfoNode, RuleType } from '../../parser/types.js';
import type { ReactTokenType } from '../ParserReact.js';

// React.createElement(T, { keyName: 'key1' }, "default value")
// ^^^^^^^^^^^^^^^^^^^^^--------------------------------------^
export const reactCreateElement = {
  trigger: 'trigger.react.create.t.element',
  call(context) {
    const line = context.getCurrentLine();
    const args = parseList(context, 'expression.end');

    if (args.type !== 'array') {
      // invalid arguments
      return args;
    }

    const result: KeyInfoNode = {
      type: 'keyInfo',
      line,
      dependsOnContext: false,
      values: [],
    };

    const [props, ...children] = args.values;

    // read props
    if (props.type === 'dict') {
      for (const [key, value] of Object.entries(props.value)) {
        switch (key) {
          case 'keyName':
            result.keyName = value;
            break;
          case 'defaultValue':
            result.defaultValue = value;
            break;
          case 'ns':
            result.namespace = value;
            break;
          default:
            // unknown parameter
            result.values.push(value);
        }
      }
    }

    let child: GeneralNode | undefined;

    // if there is multiple children, wrap them in array
    if (children.length === 1) {
      child = children[0];
    } else if (children.length > 1) {
      child = { type: 'array', line: children[0].line, values: children };
    }

    // read children
    if (child) {
      if (!result.keyName) {
        result.keyName = child;
      } else if (!result.defaultValue) {
        result.defaultValue = child;
      } else {
        // child has no semantic meaning
        result.values.push(child);
      }
    }

    return result;
  },
} satisfies RuleType<ReactTokenType>;
