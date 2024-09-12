import { pipeMachines } from '../parser/mergerMachine.js';
import { DEFAULT_BLOCKS, DEFAULT_MERGERERS, Parser } from '../parser/parser.js';
import { IterableItem, Token } from '../parser/types.js';

import { GeneralTokenType, generalMapper } from '../parser/generalMapper.js';
import { reactMapper } from './jsxMapper.js';

import { createElementMerger } from './tokenMergers/createElementMerger.js';
import { tComponentMerger } from './tokenMergers/tComponentMerger.js';
import { tFunctionMerger } from './tokenMergers/tFunctionMerger.js';
import { useTranslateMerger } from './tokenMergers/useTranslateMerger.js';

import { reactCreateElement } from './rules/createElement.js';
import { tComponent } from './rules/tComponent.js';
import { tFunction } from './rules/tFunction.js';
import { useTranslate } from './rules/useTranslate.js';

const reactMappers = [generalMapper, reactMapper];

export type ReactMappedTokenType = NonNullable<
  GeneralTokenType | ReturnType<(typeof reactMappers)[number]>
>;

export const reactMergers = pipeMachines([
  ...DEFAULT_MERGERERS,
  createElementMerger,
  useTranslateMerger,
  tFunctionMerger,
  tComponentMerger,
]);

export type ReactTokenType =
  | ReactMappedTokenType
  | NonNullable<IterableItem<ReturnType<typeof reactMergers>>['customType']>;

export type ReactToken = Token<ReactTokenType>;

export const ParserReact = () => {
  return Parser<ReactTokenType>({
    mappers: reactMappers,
    blocks: {
      ...DEFAULT_BLOCKS,
    },
    rules: [reactCreateElement, tComponent, tFunction, useTranslate],
    merger: reactMergers,
  });
};
