import { getTranslateProps } from '../tree/getTranslateProps.js';
import { parseList } from '../tree/parseList.js';
import { KeyInfoNode, ParserContext } from '../types.js';

// t('key_name', 'default_value', { ns: 'namespace' })
// ^^------------------------------------------------^
export const tFunctionGeneral = (
  context: ParserContext<any>,
  dependsOnContext: boolean
) => {
  const line = context.getCurrentLine();
  const args = parseList(context, 'expression.end');

  if (args.type !== 'array') {
    // invalid arguments
    return args;
  }

  const { result: props, optionsDynamic } = getTranslateProps(args);

  if (props.type !== 'dict') {
    return props;
  }

  const result: KeyInfoNode = {
    type: 'keyInfo',
    line,
    dependsOnContext,
    values: [],
    optionsDynamic,
  };

  // read props
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
        // unknown parameter
        result.values.push(value);
    }
  }

  return result;
};
