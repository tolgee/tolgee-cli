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

    case 'variable': {
      // Look ahead for a same-file `NAME.PROP` member access. The tokens
      // are forward-only, but the only way `variable + acessor.dot +
      // variable` shows up in a value position is when the user is
      // referencing a constants object — consuming those tokens here
      // doesn't disrupt any other parse path.
      const next = context.tokens.peek();
      if (next?.customType === 'acessor.dot') {
        context.tokens.next();
        const afterDot = context.tokens.peek();
        if (afterDot?.customType === 'variable') {
          context.tokens.next();
          const memberKey = `${token.token}.${afterDot.token}`;
          const memberResolved = context.constants.get(memberKey);
          if (memberResolved !== undefined) {
            return { type: 'primitive', line, value: memberResolved };
          }
          return { type: 'expr', line, values: [] };
        }
      }
      const resolved = context.constants.get(token.token);
      if (resolved !== undefined) {
        return { type: 'primitive', line, value: resolved };
      }
      return { type: 'expr', line, values: [] };
    }

    default:
      return { type: 'expr', line, values: [] };
  }
}
