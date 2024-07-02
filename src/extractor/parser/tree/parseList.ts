import { GeneralTokenType } from '../generalMapper.js';
import { GeneralNode, ParserContext, Token } from '../types.js';
import { parseGeneral } from './parseGeneral.js';

/*
 * React.createElement(T, { keyName: 'key1' }, "default value")
 *                     ^--------------------------------------^
 *
 * or
 *
 * ['item', 'item']
 * ^--------------^
 */

export function parseList<T extends string = GeneralTokenType>(
  context: ParserContext<T>,
  end: T
): GeneralNode {
  const { tokens, getCurrentLine } = context;
  const line = getCurrentLine();
  tokens.next();
  const result: GeneralNode[] = [];

  let token: Token<T> | undefined;
  while ((token = tokens.current())) {
    if (end && end === token.customType) {
      tokens.next();
      break;
    }

    switch (token.customType) {
      case 'separator.comma':
        tokens.next();
        break;
      default:
        result.push(
          parseGeneral(context, {
            end: ['separator.comma', end!] as T[],
          })
        );
    }
  }

  return { type: 'array', line, values: result };
}
