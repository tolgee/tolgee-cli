import { GeneralTokenType } from '../generalMapper.js';
import { simplifyNode } from '../nodeUtils.js';
import {
  ExpressionNode,
  ExtractGeneralOptions,
  GeneralNode,
  ParserContext,
  Token,
} from '../types.js';
import { getValue } from './getValue.js';
import { parseList } from './parseList.js';
import { parseObject } from './parseObject.js';

export function parseGeneral<T extends string = GeneralTokenType>(
  context: ParserContext<T>,
  options: ExtractGeneralOptions<T>
): GeneralNode {
  const { tokens, ruleMap, withLabel, blocks } = context;
  const { end, keepNested } = options;

  const result: ExpressionNode = {
    type: 'expr',
    line: context.getCurrentLine(),
    values: [],
  };

  let token: Token<T> | undefined;
  while ((token = tokens.current())) {
    const type = token.customType;

    if (!token || (end && end.includes(token.customType!))) {
      break;
    }

    if (!type) {
      result.values.push(getValue<T>(context));
      tokens.next();
    } else if (ruleMap.has(type)) {
      result.values.push(
        withLabel(ruleMap.get(type)!)(context as ParserContext<any>)
      );
      if (token === tokens.current()) {
        throw new Error(
          `SYSTEM ERROR: Rule "${type}" didn't consume any tokens`
        );
      }
      // not loading new token when rule ended
    } else if (type === 'block.begin') {
      result.values.push(withLabel(parseObject)(context));
    } else if (type === 'list.begin') {
      result.values.push(withLabel(parseList)<T>(context, 'list.end' as T));
      // list consumes last token, so no loading next
    } else if (blocks[type as GeneralTokenType]) {
      withLabel(tokens.next)();
      result.values.push(
        withLabel(parseGeneral)(context, {
          end: blocks[type]! as T[],
          keepNested,
        })
      );
      withLabel(tokens.next)();
    } else {
      result.values.push(getValue(context));
      tokens.next();
    }
  }
  return keepNested ? result : simplifyNode(result);
}
