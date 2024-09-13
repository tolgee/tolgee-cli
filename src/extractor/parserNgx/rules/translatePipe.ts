import { isString } from '#cli/extractor/parser/nodeUtils.js';
import { parseGeneral } from '../../parser/tree/parseGeneral.js';
import {
  GeneralNode,
  KeyInfoNode,
  RuleType,
  Token,
} from '../../parser/types.js';
import type { NgxTokenType } from '../ParserNgx.js';
import { parsePipeArgs } from './helpers/parsePipeArgs.js';

// <div title={{'test' | translate}}></div>
//            ^^------------------^^
export const translatePipe = {
  trigger: 'trigger.translate.pipe',
  call(context) {
    const { tokens, getCurrentLine } = context;
    const line = getCurrentLine();
    tokens.next();
    const result: GeneralNode[] = [];

    let token: Token<NgxTokenType> | undefined;
    while ((token = tokens.current())) {
      if (token.customType === 'expression.template.end') {
        tokens.next();
        break;
      } else if (token.customType === 'operator.logical') {
        tokens.next();
      } else if (
        token.customType === 'function.call.pipe' &&
        token.token === 'translate'
      ) {
        tokens.next();
        const args = parsePipeArgs(context, [
          'operator.logical',
          'expression.template.end',
        ]);
        const keyNode: KeyInfoNode = {
          type: 'keyInfo',
          line: getCurrentLine(),
          keyName: result[result.length - 1],
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
        result.push(keyNode);
      } else {
        result.push(
          parseGeneral(context, {
            end: [
              'operator.logical',
              'expression.template.end',
            ] as NgxTokenType[],
          })
        );
      }
    }
    return { type: 'array', line, values: result };
  },
} satisfies RuleType<NgxTokenType>;
