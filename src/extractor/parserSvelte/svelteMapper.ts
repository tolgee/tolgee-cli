import { Token } from '../parser/types.js';

export const svelteMapper = (token: Token) => {
  switch (token.type) {
    // strings
    case 'punctuation.definition.string.begin.svelte':
      return 'string.quote';
    case 'punctuation.definition.string.end.svelte':
      return 'string.quote';
    case 'string.quoted.svelte':
      return 'string.body';
    case 'string.unquoted.svelte':
      return 'string';

    // svelte template expression
    case 'punctuation.section.embedded.begin.svelte':
      return 'expression.template.begin';
    case 'punctuation.section.embedded.end.svelte':
      return 'expression.template.end';

    //
    case 'punctuation.definition.variable.svelte':
      return 'store.accessor.svelte';

    // svelte template
    // tags
    case 'punctuation.definition.tag.begin.svelte':
      return token.token === '</' ? 'tag.closing.begin' : 'tag.regular.begin';
    case 'punctuation.definition.tag.end.svelte':
      return token.token === '/>' ? 'tag.self-closing.end' : 'tag.regular.end';
    case 'support.class.component.svelte':
    case 'entity.name.tag.svelte':
      return 'tag.name';
    case 'entity.other.attribute-name.svelte':
      return 'tag.attribute.name';
    case 'punctuation.separator.key-value.svelte':
      return 'operator.assignment';

    // html comments
    case 'punctuation.definition.comment.svelte':
      return 'comment.definition';
    case 'comment.block.svelte':
      return 'comment.block';
  }
};
