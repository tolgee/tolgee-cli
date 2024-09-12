import { pipeMachines } from '../parser/mergerMachine.js';
import { DEFAULT_BLOCKS, DEFAULT_MERGERERS, Parser } from '../parser/parser.js';
import { IterableItem, Token } from '../parser/types.js';

import { GeneralTokenType, generalMapper } from '../parser/generalMapper.js';
import { ngxMapper } from './ngxMapper.js';

// import { createElementMerger } from './tokenMergers/createElementMerger.js';
import { tComponentMerger } from './tokenMergers/elementMerger.js';
import { generalComponent } from './rules/generalComponent.js';
// import { tFunctionMerger } from './tokenMergers/tFunctionMerger.js';
// import { useTranslateMerger } from './tokenMergers/useTranslateMerger.js';

// import { ngxCreateElement } from './rules/createElement.js';
// import { tComponent } from './rules/tComponent.js';
// import { tFunction } from './rules/tFunction.js';
// import { useTranslate } from './rules/useTranslate.js';

const ngxMappers = [ngxMapper, generalMapper];

export type NgxMappedTokenType = NonNullable<
  GeneralTokenType | ReturnType<(typeof ngxMappers)[number]>
>;

export const ngxMergers = pipeMachines([
  ...DEFAULT_MERGERERS,
  // createElementMerger,
  // useTranslateMerger,
  // tFunctionMerger,
  tComponentMerger,
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
    rules: [
      generalComponent,
      // ngxCreateElement, tComponent, tFunction, useTranslate
    ],
    merger: ngxMergers,
  });
};
