import { GeneralTokenType } from '../generalMapper.js';
import { isEmptyExpr, simplifyNode } from '../nodeUtils.js';
import { parseGeneral } from './parseGeneral.js';
import { extractProps } from './parseProps.js';
import { GeneralNode, ParserContext } from '../types.js';

// <T keyName="test">Default</T>
// ^^-----------------------^^^^
export const parseTag = (context: ParserContext<any>) => {
  const { tokens } = context as ParserContext<GeneralTokenType>;
  const props = extractProps(context);
  let child: GeneralNode | undefined;

  const currentTag = tokens.current();

  if (currentTag?.customType === 'tag.regular.end') {
    tokens.next();
    // it's not self-closing and there are children
    const extracted = parseGeneral(context, {
      end: ['tag.closing'],
      // don't simplify here, to see, if there are any children
      keepNested: true,
    });
    if (!isEmptyExpr(extracted)) {
      // there are some children
      child = simplifyNode(extracted);
    }
  }
  tokens.next();

  return { props, child };
};
