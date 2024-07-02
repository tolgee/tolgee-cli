import { GeneralTokenType } from '../generalMapper.js';
import { parseTag } from '../tree/parseTag.js';
import { KeyInfoNode, ParserContext } from '../types.js';

// <T keyName="test">Default</T>
// ^^-----------------------^^^^
export const tComponentGeneral = (context: ParserContext<any>) => {
  const { getCurrentLine } = context as ParserContext<GeneralTokenType>;
  const line = getCurrentLine();
  const { props, child } = parseTag(context);

  const result: KeyInfoNode = {
    type: 'keyInfo',
    line,
    dependsOnContext: false,
    values: [],
  };

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
          result.values.push(value);
      }
    }
  }

  // read children
  if (child) {
    if (!result.keyName) {
      result.keyName = child;
    } else if (!result.defaultValue) {
      result.defaultValue = child;
    } else {
      result.values.push(child);
    }
  }

  return result;
};
