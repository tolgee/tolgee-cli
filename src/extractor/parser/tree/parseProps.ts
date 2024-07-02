import { GeneralTokenType } from '../generalMapper.js';
import { DictNode, GeneralNode, ParserContext, Token } from '../types.js';
import { parseGeneral } from './parseGeneral.js';

export const enum S {
  ExpectAttribute,
  ExpectAssign,
  ExpectValue,
}

// <T keyName="key1" defaultValue="default value" />
// ^^–––––––––––––––––––––––––––––^^^^^^^^^^^^^^^
export function extractProps<T extends string = GeneralTokenType>(
  context: ParserContext<T>
): GeneralNode {
  function getShortHandValue(): GeneralNode {
    return { type: 'primitive', line: getCurrentLine(), value: true };
  }

  const { tokens, getCurrentLine } = context;
  const line = getCurrentLine();
  tokens.next();
  const result: DictNode = { type: 'dict', line, value: {}, unknown: [] };

  let token: Token<T> | undefined;
  let state = S.ExpectAttribute;
  let lastKey: string | undefined;

  while ((token = tokens.current())) {
    const type = token.customType;

    if (type === 'tag.self-closing.end' || type === 'tag.regular.end') {
      break;
    }

    switch (state) {
      case S.ExpectAttribute:
        if (type === 'tag.attribute.name') {
          lastKey = token.token;
          state = S.ExpectAssign;
          // assign in case it's shorthand
          result.value[lastKey] = getShortHandValue();
        }
        break;
      case S.ExpectAssign:
        if (type === 'operator.assignment') {
          state = S.ExpectValue;
        } else if (type === 'tag.attribute.name') {
          // last one was shorthand
          lastKey = token.token;
          state = S.ExpectAssign;
          // assign in case it's shorthand
          result.value[lastKey] = getShortHandValue();
        }
        break;
      case S.ExpectValue:
        result.value[lastKey!] = parseGeneral(context, {
          end: [
            'tag.attribute.name',
            'tag.self-closing.end',
            'tag.regular.end',
          ] as T[],
        });
        state = S.ExpectAttribute;
        lastKey = undefined;
        continue;
    }
    tokens.next();
  }

  return result;
}
