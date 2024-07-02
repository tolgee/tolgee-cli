import { parseList } from '../tree/parseList.js';
import { NamespaceInfoNode, ParserContext } from '../types.js';

/**
 * useTranslate('namespace')
 * ^^^^^^^^^^^^^-----------^
 *
 * or
 *
 * useTranslate(['namespace', ...])
 * ^^^^^^^^^^^^^------------------^
 */
export const tNsSourceGeneral = (context: ParserContext<any>) => {
  const line = context.getCurrentLine();
  const args = parseList(context, 'expression.end');

  if (args.type !== 'array') {
    // invalid arguments
    return args;
  }

  const result: NamespaceInfoNode = {
    type: 'nsInfo',
    line,
    values: [],
  };

  const [firstArg, ...otherArgs] = args.values;

  if (firstArg?.type === 'array') {
    // useTranslate(['namespace', ...])
    const [firstItem, ...otherItems] = firstArg.values;

    result.name = firstItem;
    otherItems.forEach((item) => result.values.push(item));
  } else {
    // useTranslate('namespace')
    result.name = firstArg;
  }

  otherArgs.forEach((arg) => result.values.push(arg));

  return result;
};
