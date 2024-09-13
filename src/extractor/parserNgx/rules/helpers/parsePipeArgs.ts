import { parseGeneral } from '../../../../extractor/parser/tree/parseGeneral.js';
import {
  ArrayNode,
  ParserContext,
  Token,
} from '../../../../extractor/parser/types.js';
import { NgxTokenType } from '../../ParserNgx.js';

/*
 * :{ noWrap: true }:'item'
 * ^----------------------^
 */

export function parsePipeArgs(
  context: ParserContext<NgxTokenType>,
  end: NgxTokenType[]
): ArrayNode {
  const { tokens, getCurrentLine } = context;
  const line = getCurrentLine();
  const result: ArrayNode = { type: 'array', line, values: [] };
  let token: Token<NgxTokenType> | undefined;

  while ((token = tokens.current())) {
    if (end.includes(token.customType!)) {
      break;
    }

    switch (token.customType) {
      case 'operator.navigator':
        tokens.next();
        break;
      default:
        result.values.push(
          parseGeneral(context, {
            end: ['operator.navigator', ...end] as NgxTokenType[],
          })
        );
    }
  }

  return result;
}
