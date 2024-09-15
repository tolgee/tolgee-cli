import { isString } from '../../../extractor/parser/nodeUtils.js';
import { GeneralNode, KeyInfoNode, RuleType } from '../../parser/types.js';
import type { NgxTokenType } from '../ParserNgx.js';
import { parsePipeArgs } from './helpers/parsePipeArgs.js';

// <div title={{'test' | translate:{noWrap: true}:'default value'}}></div>
//                     ^^^^^^^^^^^----------------^^^^^^^^^^^^^^^
export const translatePipe = {
  trigger: 'trigger.translate.pipe',
  call(context) {
    const { tokens, getCurrentLine } = context;
    const line = getCurrentLine();
    tokens.next();

    const args = parsePipeArgs(context, [
      'operator.logical',
      'expression.template.end',
      'expression.end',
    ]);
    const keyNode: KeyInfoNode = {
      type: 'keyInfo',
      line,
      keyName: undefined,
      dependsOnContext: false,
      values: [],
    } satisfies KeyInfoNode;
    let options: GeneralNode | undefined = undefined;
    if (args.values.length === 1) {
      if (isString(args.values[0])) {
        keyNode.defaultValue = args.values[0];
      } else {
        options = args.values[0];
      }
    } else if (args.values.length > 1) {
      options = args.values.shift();
      keyNode.defaultValue = args.values.shift();
      keyNode.values = args.values;
    }
    if (options?.type === 'dict') {
      for (const [key, value] of Object.entries(options.value)) {
        switch (key) {
          case 'ns':
            keyNode.namespace = value;
            break;
          default:
            // unknown parameter
            keyNode.values.push(value);
        }
      }
    } else if (options) {
      keyNode.optionsDynamic = true;
    }
    return keyNode;
  },
} satisfies RuleType<NgxTokenType>;
