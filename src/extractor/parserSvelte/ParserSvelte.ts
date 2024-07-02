import { pipeMachines } from '../parser/mergerMachine.js';
import { DEFAULT_BLOCKS, DEFAULT_MERGERERS, Parser } from '../parser/parser.js';
import { IterableItem, Token } from '../parser/types.js';
import { svelteMapper } from './svelteMapper.js';
import { GeneralTokenType, generalMapper } from '../parser/generalMapper.js';

import { tFunctionMerger } from './tokenMergers/tFunctionMerger.js';
import { getTranslateMerger } from './tokenMergers/getTranslateMerger.js';
import { scriptTagMerger } from './tokenMergers/scriptTagMerger.js';
import { tComponentMerger } from './tokenMergers/tComponentMerger.js';

import { tFunction } from './rules/tFunction.js';
import { getTranslate } from './rules/useTranslate.js';
import { tComponent } from './rules/tComponent.js';
import { scriptTag } from './rules/scriptTag.js';

import { svelteTreeTransform } from './svelteTreeTransform.js';

const svelteMappers = [generalMapper, svelteMapper];

export type SvelteMappedTokenType = NonNullable<
  GeneralTokenType | ReturnType<(typeof svelteMappers)[number]>
>;

export const svelteMergers = pipeMachines([
  ...DEFAULT_MERGERERS,
  tFunctionMerger,
  getTranslateMerger,
  tComponentMerger,
  scriptTagMerger,
]);

export type SvelteTokenType =
  | SvelteMappedTokenType
  | NonNullable<IterableItem<ReturnType<typeof svelteMergers>>['customType']>;

export type SvelteToken = Token<SvelteTokenType>;

export const ParserSvelte = () => {
  return Parser<SvelteTokenType>({
    mappers: svelteMappers,
    blocks: {
      ...DEFAULT_BLOCKS,
    },
    rules: [tFunction, getTranslate, tComponent, scriptTag],
    treeTransform: svelteTreeTransform,
    merger: svelteMergers,
  });
};
