import { Token } from '../parser/types.js';

export const reactMapper = (token: Token) => {
  switch (token.type) {
    // JSX string children
    case 'meta.jsx.children.tsx':
      return 'string.template';

    // template strings - treating as expression
    case 'punctuation.definition.template-expression.begin.ts':
    case 'punctuation.section.embedded.begin.tsx':
      return 'expression.template.begin';
    case 'punctuation.definition.template-expression.end.ts':
    case 'punctuation.section.embedded.end.tsx':
      return 'expression.template.end';

    // react tags
    case 'punctuation.definition.tag.begin.tsx':
      return token.token === '</' ? 'tag.closing.begin' : 'tag.regular.begin';
    case 'punctuation.definition.tag.end.tsx':
      return token.token === '/>' ? 'tag.self-closing.end' : 'tag.regular.end';
    case 'support.class.component.tsx':
    case 'entity.name.tag.tsx':
      return 'tag.name';
    case 'entity.other.attribute-name.tsx':
      return 'tag.attribute.name';
  }
};
