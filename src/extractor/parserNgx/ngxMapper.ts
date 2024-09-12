import { Token } from '../parser/types.js';

export const ngxMapper = (token: Token) => {
  switch (token.type) {
    // vue template tags
    case 'punctuation.definition.tag.begin.html':
      return token.token === '</' ? 'tag.closing.begin' : 'tag.regular.begin';

    case 'punctuation.definition.tag.end.html':
      return token.token === '/>' ? 'tag.self-closing.end' : 'tag.regular.end';

    case 'entity.name.tag.html':
      return 'tag.name';

    case 'entity.other.attribute-name.html':
      return 'tag.attribute.name';
    case 'punctuation.separator.key-value.html':
      return 'operator.assignment';

    // html string attributes
    case 'punctuation.definition.string.begin.html':
      return 'string.begin';
    case 'punctuation.definition.string.end.html':
      return 'string.end';
    case 'string.quoted.single.html':
    case 'string.quoted.double.html':
      return 'string.body';
    case 'string.unquoted.html':
      return 'string';

    // html comments
    case 'punctuation.definition.comment.html':
      return 'comment.definition';
    case 'comment.block.html':
      return 'comment.block';

    // `export default` is needed to track down setup function
    case 'keyword.control.export.ts':
      return 'keyword.export';
    case 'keyword.control.default.ts':
      return 'keyword.default';

    // curly brackets - blocks
    case 'punctuation.definition.block.ts':
      switch (token.token) {
        case '{':
          return 'block.begin';
        case '}':
          return 'block.end';
        case '{{':
          return 'expression.template.begin';
        case '}}':
          return 'expression.template.end';
      }
  }
};
