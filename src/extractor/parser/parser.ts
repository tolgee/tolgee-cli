import { MagicCommentEvent, extractComment } from './extractComment.js';
import type {
  BlocksType,
  GeneralNode,
  ParserContext,
  RuleMap,
  RuleType,
  Token,
} from './types.js';
import {
  IteratorListener,
  ParserIterator,
  createIterator,
} from './iterator.js';
import { GeneralToken, GeneralTokenType } from './generalMapper.js';
import { generateReport, Report } from './generateReport.js';
import { parseGeneral } from './tree/parseGeneral.js';
import { commentsMerger } from './tokenMergers/commentsMerger.js';
import { createMachine } from './mergerMachine.js';
import { ExtractOptions, ExtractedKey, Warning } from '../index.js';
import { stringMerger } from './tokenMergers/stringMerger.js';
import { templateStringMerger } from './tokenMergers/templateStringMerger.js';
import { closingTagMerger } from './tokenMergers/closingTagMerger.js';
import { typesAsMergerer } from './tokenMergers/typesAsMergerer.js';
import { typesCastMergerer } from './tokenMergers/typesCastMerger.js';

export const DEFAULT_BLOCKS = {
  'block.begin': ['block.end'],
  'expression.begin': ['expression.end'],
  'expression.template.begin': ['expression.template.end'],
  'tag.regular.begin': [
    'tag.closing',
    'tag.self-closing.end',
    'tag.closing.begin',
  ],
} satisfies BlocksType<GeneralTokenType>;

export const DEFAULT_MERGERERS = [
  stringMerger,
  templateStringMerger,
  closingTagMerger,
  typesAsMergerer,
  typesCastMergerer,
] as const;

type ParserOptions<T extends string = GeneralTokenType> = {
  mappers: ((token: Token) => string | undefined)[];
  rules: RuleType<T>[];
  blocks: BlocksType<T>;
  merger: (tokens: Iterable<GeneralToken>) => Iterable<Token<T>>;
  treeTransform?: (tree: GeneralNode) => { tree: GeneralNode; report?: Report };
};

type ParseOptions<T extends string = GeneralTokenType> = {
  tokens: Iterable<Token<any>>;
  onAccept?: IteratorListener<T>;
  options: ExtractOptions;
};

export const Parser = <T extends string = GeneralTokenType>({
  mappers,
  blocks,
  rules,
  merger,
  treeTransform,
}: ParserOptions<T>) => {
  const ruleMap: RuleMap<T> = new Map();
  rules.forEach(({ trigger, call }) => {
    ruleMap.set(trigger, call);
  });

  let iterator: ParserIterator<T>;

  function getCurrentLine() {
    return iterator.getLineNumber();
  }

  return {
    parse({ tokens, onAccept, options }: ParseOptions<T>) {
      for (const t of tokens) {
        // use first mapper, which gives some result
        const type = mappers.find((mapper) => mapper(t))?.(t);
        t.customType = type;
      }

      const mergedComments = [...createMachine(commentsMerger)(tokens)];

      const comments = mergedComments
        .filter((c) => c.customType === 'comment')
        .map((token) => extractComment(token as Token<'comment'>))
        .filter(Boolean) as MagicCommentEvent[];

      // remove whitespaces and comments
      const filteredWhitespaces = mergedComments.filter((t) => {
        if (t.customType === 'comment') {
          return false;
        }
        if (t.customType === 'ignore') {
          return false;
        }
        if (!t.customType && t.token.match(/^[\s]+$/gmu)) {
          return false;
        }
        return true;
      });

      const mergedTokens = [...merger(filteredWhitespaces)];

      // remove ignored after merge
      const filteredIgnored = mergedTokens.filter((t) => {
        if (t.customType === 'ignore') {
          return false;
        }
        return true;
      });

      iterator = createIterator(filteredIgnored);

      const context: ParserContext<T> = {
        tokens: iterator,
        getCurrentLine,
        withLabel,
        ruleMap,
        blocks,
      };

      let depth = 0;

      function withLabel<T extends Array<any>, U>(fn: (...args: T) => U) {
        return (...args: T): U => {
          let label: string;
          const currentTokenName = context.tokens.current()?.customType || '';
          const isTrigger = currentTokenName.startsWith('trigger.');
          if (!isTrigger) {
            depth += 1;
            label = `depth.${depth}`;
          } else {
            label = currentTokenName;
          }
          const previous = iterator.getLabel();
          iterator.setLabel(label);
          const result = fn(...args);
          iterator.setLabel(previous);
          if (!isTrigger) {
            depth -= 1;
          }
          return result;
        };
      }

      iterator.next();

      if (onAccept) {
        iterator.onAccept(onAccept);
      }

      let rootNode = parseGeneral(context, {
        end: [],
        keepNested: true,
      });

      const keys: ExtractedKey[] = [];
      const warnings: Warning[] = [];

      if (treeTransform) {
        const { tree, report } = treeTransform(rootNode);
        rootNode = tree;
        if (report) {
          keys.push(...report.keys);
          warnings.push(...report.warnings);
        }
      }

      const report = generateReport({ node: rootNode, comments, options });

      keys.push(...report.keys);
      warnings.push(...report.warnings);

      return {
        tree: rootNode,
        report: { keys, warnings },
      };
    },
  };
};
