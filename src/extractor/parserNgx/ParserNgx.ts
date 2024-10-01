import { pipeMachines } from '../parser/mergerMachine.js';
import { DEFAULT_BLOCKS, DEFAULT_MERGERERS, Parser } from '../parser/parser.js';
import { IterableItem, Token } from '../parser/types.js';

import { GeneralTokenType, generalMapper } from '../parser/generalMapper.js';
import { ngxMapper } from './ngxMapper.js';
import { ngxTreeTransform } from './ngxTreeTransform.js';

import { componentWithTMerger } from './tokenMergers/elementMerger.js';
import { translateMerger } from './tokenMergers/translateMerger.js';
import { pipeMerger } from './tokenMergers/pipeMerger.js';

import { componentWithT } from './rules/componentWithT.js';
import { translatePipe } from './rules/translatePipe.js';
import { translateFunction } from './rules/translateFunction.js';

const ngxMappers = [ngxMapper, generalMapper];

export type NgxMappedTokenType = NonNullable<
  GeneralTokenType | ReturnType<(typeof ngxMappers)[number]>
>;

export const ngxMergers = pipeMachines([
  ...DEFAULT_MERGERERS,
  componentWithTMerger,
  pipeMerger,
  translateMerger,
]);

export type NgxTokenType =
  | NgxMappedTokenType
  | NonNullable<IterableItem<ReturnType<typeof ngxMergers>>['customType']>;

export type NgxToken = Token<NgxTokenType>;

export const ParserNgx = () => {
  return Parser<NgxTokenType>({
    mappers: ngxMappers,
    blocks: {
      ...DEFAULT_BLOCKS,
    },
    rules: [componentWithT, translatePipe, translateFunction],
    merger: ngxMergers,
    treeTransform: ngxTreeTransform,
  });
};
