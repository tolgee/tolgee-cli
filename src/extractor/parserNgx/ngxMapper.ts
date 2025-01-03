import { Token } from '../parser/types.js';

export const ngxMapper = (token: Token) => {
  // custom tag names have dynamic token names
  if (token.type?.startsWith('entity.name.tag.html.ng.')) {
    return 'tag.name';
  }

  switch (token.type) {
    // ngx template tags
    case 'punctuation.definition.tag.begin.html':
      return token.token === '</' ? 'tag.closing.begin' : 'tag.regular.begin';

    case 'punctuation.definition.tag.end.html':
      return token.token === '/>' ? 'tag.self-closing.end' : 'tag.regular.end';

    case 'html-template.tag.html':
      return 'tag.name';

    case 'html-template.ng.attributes.generic':
      return 'tag.attribute.name';

    case 'punctuation.separator.key-value.html-template.ng':
      return 'operator.assignment';

    case 'entity.other.attribute-name.html':
      return 'tag.attribute.name';
    case 'punctuation.separator.key-value.html':
      return 'operator.assignment';

    // html string attributes
    case 'punctuation.definition.string.begin.html':
      return 'string.quote';
    case 'punctuation.definition.string.end.html':
      return 'string.quote';
    case 'string.quoted.single.html':
    case 'string.quoted.double.html':
      if (token.token === '"' || token.token === "'") {
        // ignoring qotes around strings and expressions
        // we can just take the content without them
        // as otherwise we would need to distinguish if it's an expression or string
        // (angular grammar doesn't do this for some reason)
        return 'ignore';
      } else {
        return 'string';
      }
    case 'string.unquoted.html':
      return 'string';

    case 'html-template.ng.attributes.input-binding.first-level':
    case 'html-template.ng.attributes.event-handler':
      return 'tag.attribute.name';

    case 'punctuation.definition.ng-binding-name.begin.html':
    case 'punctuation.definition.ng-binding-name.end.html':
      // ignoring binding brackets, irrelevant for us
      return 'ignore';

    // html comments
    case 'punctuation.definition.comment.begin.html':
    case 'punctuation.definition.comment.end.html':
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

    case 'variable.other.object.property.ts':
      return 'variable';

    // angular interpolation
    case 'html-template.ng.interpolation.begin':
      return 'expression.template.begin';
    case 'html-template.ng.interpolation.end':
      return 'expression.template.end';
  }
};
