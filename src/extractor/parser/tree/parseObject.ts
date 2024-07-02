import { GeneralTokenType } from '../generalMapper.js';
import { extractString, isString } from '../nodeUtils.js';
import {
  DictNode,
  ExpressionNode,
  GeneralNode,
  ParserContext,
  Token,
} from '../types.js';
import { parseGeneral } from './parseGeneral.js';

export const enum S {
  ExpectProperty,
  ExpectDoubleColon,
  ExpectValue,
  ExpectComma,
}

// { key: 'value', ... }
// ^-------------------^
export function parseObject(context: ParserContext<any>): GeneralNode {
  const { tokens, getCurrentLine } = context as ParserContext<GeneralTokenType>;
  const line = getCurrentLine();
  const result: DictNode = { type: 'dict', line, value: {}, unknown: [] };
  tokens.next();

  let token: Token<GeneralTokenType> | undefined;
  let state = S.ExpectProperty;
  let lastKey: string | undefined;

  function fallbackToBlock() {
    const combinedResult: ExpressionNode = {
      type: 'expr',
      line,
      values: [...Object.values(result.value), ...result.unknown],
    };
    const parsedContent = parseGeneral(context, {
      end: ['block.end'] as GeneralTokenType[],
    });
    tokens.next();
    if (parsedContent.type === 'expr') {
      // avoid nesting
      combinedResult.values.push(...parsedContent.values);
    } else {
      combinedResult.values.push(parsedContent);
    }
    return combinedResult;
  }

  loop: while ((token = tokens.current())) {
    const type = token.customType;

    if (type === 'block.end') {
      tokens.next();
      break loop;
    }

    switch (state) {
      case S.ExpectProperty:
        if (type === 'object.key') {
          state = S.ExpectDoubleColon;
          lastKey = token.token;
        } else if (type === 'variable') {
          result.value[token.token] = {
            type: 'expr',
            line: getCurrentLine(),
            values: [],
          };
          state = S.ExpectComma;
        } else if (type === 'list.begin') {
          // dynamic key name '[value]: ...'
          tokens.next();
          const inside = parseGeneral<GeneralTokenType>(context, {
            end: ['list.end'],
          });
          if (isString(inside)) {
            lastKey = extractString(inside);
          } else {
            // dynamic keyname
            result.unknown.push(inside);
            lastKey = undefined;
          }
          state = S.ExpectDoubleColon;
        } else if (type === 'kw.async') {
          // there might be async function call,
          // we can just ignore this keyword
        } else if (type === 'function.call') {
          // shorthand for function definition, treat as dynamic value
          result.value[token.token] = parseGeneral(context, {
            end: ['separator.comma', 'block.end'] as GeneralTokenType[],
          });
          state = S.ExpectComma;
          // don't load next token, it was loaded by extract
          continue;
        } else {
          // it's not object, but block
          // just somehow stich together already loaded values
          // and the rest
          return fallbackToBlock();
        }
        break;
      case S.ExpectDoubleColon:
        if (type === 'acessor.doublecolon') {
          state = S.ExpectValue;
        } else {
          // it's not object, but block
          // just somehow stich together already loaded values
          // and the rest
          return fallbackToBlock();
        }
        break;
      case S.ExpectValue: {
        const value = parseGeneral(context, {
          end: ['separator.comma', 'block.end'] as GeneralTokenType[],
        });

        if (lastKey) {
          result.value[lastKey] = value;
        } else {
          // unknown key name
          result.unknown.push(value);
        }

        lastKey = undefined;
        state = S.ExpectComma;
        // don't load next token, it was loaded by extract
        continue;
      }
      case S.ExpectComma:
        if (type === 'separator.comma') {
          state = S.ExpectProperty;
        } else {
          // it's not object, but block
          // just somehow stich together already loaded values
          // and the rest
          return fallbackToBlock();
        }
        break;
    }
    tokens.next();
  }

  return result;
}
