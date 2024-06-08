import { GeneralTokenType } from './generalMapper.js';
import { ParserIterator } from './iterator.js';

export type GeneralNode =
  | ExpressionNode
  | ArrayNode
  | DictNode
  | PrimitiveNode
  | NamespaceInfoNode
  | KeyInfoNode;

type NodeCommon = {
  line: number;
  context?: string;
};

export type ExpressionNode = NodeCommon & {
  type: 'expr';
  values: GeneralNode[];
};

export type ArrayNode = NodeCommon & {
  type: 'array';
  values: GeneralNode[];
};

export type DictNode = NodeCommon & {
  context?: string;
  type: 'dict';
  value: Record<string, GeneralNode>;
  unknown: GeneralNode[];
};

export type NullNode = NodeCommon & { type: 'primitive'; value: null };
export type StringNode = NodeCommon & { type: 'primitive'; value: string };
export type NumberNode = NodeCommon & { type: 'primitive'; value: number };
export type BooleanNode = NodeCommon & { type: 'primitive'; value: boolean };
export type PrimitiveNode = StringNode | NumberNode | BooleanNode | NullNode;

// info about found stuff
export type NamespaceInfoNode = NodeCommon & {
  type: 'nsInfo';
  name?: GeneralNode;
  values: GeneralNode[];
};
export type KeyInfoNode = NodeCommon & {
  type: 'keyInfo';
  dependsOnContext: boolean;
  keyName?: GeneralNode;
  namespace?: GeneralNode;
  defaultValue?: GeneralNode;
  values: GeneralNode[];
  optionsDynamic?: boolean;
};

export type ExtractGeneralOptions<T extends string = GeneralTokenType> = {
  end: T[];
  keepNested?: boolean;
};

export type BlocksType<T extends string = GeneralTokenType> = Partial<
  Record<T, T[]>
>;
export type RuleType<T extends string = string> = {
  trigger: T;
  call: (context: ParserContext<T>) => GeneralNode;
};

export type RuleMap<T extends string = string> = Map<
  T,
  (context: ParserContext<T>) => GeneralNode
>;
export type IterableItem<T> = T extends Iterable<infer U> ? U : never;

export type Token<T extends string | undefined = string | undefined> = {
  type: string;
  customType?: T;
  token: string;
  line: number;
  startIndex: number;
  endIndex: number;
  scopes: string[];
};

export type ParserContext<T extends string = GeneralTokenType> = {
  tokens: ParserIterator<T>;
  getCurrentLine: () => number;
  withLabel: <S extends any[], U>(fn: (...args: S) => U) => (...args: S) => U;
  ruleMap: RuleMap<T>;
  blocks: BlocksType;
};
