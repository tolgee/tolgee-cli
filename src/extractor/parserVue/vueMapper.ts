import { Token } from '../parser/types.js';

export const vueMapper = (token: Token) => {
  const type = token.type;
  switch (token.type) {
    // vue template expression
    case 'punctuation.definition.string.begin.html.vue':
      return 'expression.template.begin';
    case 'punctuation.definition.string.end.html.vue':
      return 'expression.template.end';

    // vue template tags
    case 'punctuation.definition.tag.begin.html':
    case 'punctuation.definition.tag.begin.html.vue':
      return token.token === '</' ? 'tag.closing.begin' : 'tag.regular.begin';
    case 'punctuation.definition.tag.end.html.vue':
    case 'punctuation.definition.tag.end.html':
      return token.token === '/>' ? 'tag.self-closing.end' : 'tag.regular.end';
    case type.match(/^entity\.name\.tag\.[^.]+\.html\.vue$/) ? type : false:
    case 'entity.name.tag.html':
      return 'tag.name';
    case 'entity.other.attribute-name.html.vue':
    case 'entity.other.attribute-name.html':
      return 'tag.attribute.name';
    case 'punctuation.separator.key-value.html':
    case 'punctuation.separator.key-value.html.vue':
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

    // ignore template modifiers
    // we only basically care about the content
    case 'punctuation.attribute-shorthand.event.html.vue':
    case 'punctuation.attribute-shorthand.bind.html.vue':
      return 'ignore';

    // `export default` is needed to track down setup function
    case 'keyword.control.export.ts':
      return 'keyword.export';
    case 'keyword.control.default.ts':
      return 'keyword.default';
  }
};
