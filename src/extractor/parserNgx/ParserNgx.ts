import { pipeMachines } from '../parser/mergerMachine.js';
import { DEFAULT_BLOCKS, DEFAULT_MERGERERS, Parser } from '../parser/parser.js';
import { IterableItem, Token } from '../parser/types.js';

import { GeneralTokenType, generalMapper } from '../parser/generalMapper.js';
import { ngxMapper } from './ngxMapper.js';

import { componentWithTMerger } from './tokenMergers/elementMerger.js';
import { componentWithT } from './rules/componentWithT.js';
import { pipeMerger } from './tokenMergers/pipeMerger.js';
import { translatePipe } from './rules/translatePipe.js';

const ngxMappers = [ngxMapper, generalMapper];

export type NgxMappedTokenType = NonNullable<
  GeneralTokenType | ReturnType<(typeof ngxMappers)[number]>
>;

export const ngxMergers = pipeMachines([
  ...DEFAULT_MERGERERS,
  componentWithTMerger,
  pipeMerger,
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
    rules: [componentWithT, translatePipe],
    merger: ngxMergers,
  });
};
