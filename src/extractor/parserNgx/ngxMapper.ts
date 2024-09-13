import { Token } from '../parser/types.js';

export const ngxMapper = (token: Token) => {
  switch (token.type) {
    // vue template tags
    case 'punctuation.definition.tag.begin.html':
      return token.token === '</' ? 'tag.closing.begin' : 'tag.regular.begin';

    case 'punctuation.definition.tag.end.html':
      return token.token === '/>' ? 'tag.self-closing.end' : 'tag.regular.end';

    case 'html-template.tag.html':
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

    // pipeline operators
    case 'html-template.ng.expression.operator.logical':
      return 'operator.logical';
    case 'html-template.ng.expression.operator.navigator':
      return 'operator.navigator';

    case 'variable.other.property.ts':
    case 'entity.name.function.pipe.ng':
      return 'function.call.pipe';

    // angular interpolation
    case 'html-template.ng.interpolation.begin':
      return 'expression.template.begin';
    case 'html-template.ng.interpolation.end':
      return 'expression.template.end';
  }
};
