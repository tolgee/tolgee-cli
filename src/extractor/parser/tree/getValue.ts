import { GeneralTokenType } from '../generalMapper.js';
import { GeneralNode, ParserContext } from '../types.js';
import { parseGeneral } from './parseGeneral.js';

export function getValue<T extends string = GeneralTokenType>(
  context: ParserContext<T>
): GeneralNode {
  const token = context.tokens.current();
  const line = context.getCurrentLine();
  switch (token?.customType) {
    case 'string':
    case 'primitive.null':
      return { type: 'primitive', line, value: token.token };

    case 'expression.begin':
      context.tokens.next();
      return parseGeneral<T>(context, {
        end: ['expression.end'] as T[],
      });

    default:
      return { type: 'expr', line, values: [] };
  }
}
