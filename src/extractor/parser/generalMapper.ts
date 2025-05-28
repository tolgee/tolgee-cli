import type { Token } from './types.js';

export const generalMapper = (token: Token) => {
  switch (token.type) {
    // comments
    case 'punctuation.definition.comment.ts':
      return 'comment.definition';
    case 'comment.block.ts':
    case 'comment.block.documentation.ts':
      return 'comment.block';
    case 'comment.line.double-slash.ts':
      return 'comment.line';

    // primitives
    case 'constant.language.null.ts':
      return 'primitive.null';

    // plain strings
    case 'punctuation.definition.string.begin.ts':
      return 'string.quote';
    case 'punctuation.definition.string.end.ts':
      return 'string.quote';
    case 'string.quoted.single.ts':
    case 'string.quoted.double.ts':
      return 'string.body';
    case 'constant.character.escape.ts':
      return 'escaped.character';

    // template strings
    case 'punctuation.definition.string.template.begin.ts':
      return 'string.teplate.quote';
    case 'punctuation.definition.string.template.end.ts':
      return 'string.template.quote';
    case 'string.template.ts':
      return 'string.template.body';

    // variables
    case 'variable.other.object.ts':
    case 'variable.other.constant.ts':
    case 'variable.language.this.ts':
      return 'variable';

    // function
    case 'support.function.dom.ts':
    case 'entity.name.function.ts':
      return 'function.call';

    // "async" word
    case 'storage.modifier.async.ts':
      return 'kw.async';

    // "." accessor
    case 'punctuation.accessor.ts':
      return 'acessor.dot';

    // ":" accessor
    case 'punctuation.separator.label.ts':
    case 'punctuation.separator.key-value.ts':
      return 'acessor.doublecolon';

    // "," separator
    case 'punctuation.separator.comma.ts':
      return 'separator.comma';
    // "="
    case 'keyword.operator.assignment.ts':
      return 'operator.assignment';

    // curly brackets - blocks
    case 'punctuation.definition.block.ts':
      return token.token === '{' ? 'block.begin' : 'block.end';

    // rounded brackets - expressions
    case 'punctuation.definition.parameters.begin.ts':
    case 'punctuation.definition.parameters.end.ts':
    case 'meta.brace.round.ts':
      return token.token === '(' ? 'expression.begin' : 'expression.end';

    case 'meta.brace.square.ts':
      return token.token === '[' ? 'list.begin' : 'list.end';

    case 'meta.object-literal.key.ts':
    case 'entity.name.label.ts':
      return 'object.key';
    case 'variable.other.readwrite.ts':
      return 'variable';

    // ignore type annotations
    case 'keyword.control.as.ts':
      return 'typescript.as';
    case 'support.type.primitive.ts':
    case 'entity.name.type.ts':
      return 'typescript.type.primitive';
    case 'meta.brace.angle.ts':
      return token.token === '<'
        ? 'typescript.expr.begin'
        : 'typescript.expr.end';
    case 'keyword.operator.type.ts':
      return 'typescript.operator';
  }
};

export type GeneralTokenType =
  | NonNullable<ReturnType<typeof generalMapper>>
  | 'ignore'
  | 'string'
  | 'string.template'
  | 'comment'
  | 'tag.regular.begin'
  | 'tag.closing.begin'
  | 'tag.self-closing.end'
  | 'tag.regular.end'
  | 'tag.name'
  | 'tag.closing'
  | 'tag.attribute.name'
  | 'expression.template.begin'
  | 'expression.template.end'
  | 'trigger.global.t.function';
export type GeneralToken = Token<GeneralTokenType>;
