import { pipeMachines } from '../parser/mergerMachine.js';
import { DEFAULT_BLOCKS, DEFAULT_MERGERERS, Parser } from '../parser/parser.js';
import { IterableItem, Token } from '../parser/types.js';
import { GeneralTokenType, generalMapper } from '../parser/generalMapper.js';
import { vueMapper } from './vueMapper.js';
import { vueTreeTransform } from './vueTreeTransform.js';

import { globalTFunctionMerger } from './tokenMergers/globalTFunctionMerger.js';
import { tFunctionMerger } from './tokenMergers/tFunctionMerger.js';
import { useTranslateMerger } from './tokenMergers/useTranslateMerger.js';
import { exportDefaultObjectMerger } from './tokenMergers/exportDefaultObjectMerger.js';
import { scriptTagMerger } from './tokenMergers/scriptTagMerger.js';
import { tComponentMerger } from './tokenMergers/tComponentMerger.js';

import { globalTFunction } from './rules/globalTFunction.js';
import { tFunction } from './rules/tFunction.js';
import { useTranslate } from './rules/useTranslate.js';
import { tComponent } from './rules/tComponent.js';
import { scriptTag } from './rules/scriptTag.js';
import { exportDefaultObject } from './rules/exportDefaultObject.js';
import { hyphenPropsMerger } from './tokenMergers/hyphenPropsMerger.js';

const vueMappers = [generalMapper, vueMapper];

export type VueMappedTokenType = NonNullable<
  GeneralTokenType | ReturnType<(typeof vueMappers)[number]>
>;

export const vueMergers = pipeMachines([
  ...DEFAULT_MERGERERS,
  hyphenPropsMerger,
  globalTFunctionMerger,
  tFunctionMerger,
  useTranslateMerger,
  tComponentMerger,
  scriptTagMerger,
  exportDefaultObjectMerger,
]);

export type VueTokenType =
  | VueMappedTokenType
  | NonNullable<IterableItem<ReturnType<typeof vueMergers>>['customType']>;

export type VueToken = Token<VueTokenType>;

export const ParserVue = () => {
  return Parser<VueTokenType>({
    mappers: vueMappers,
    blocks: {
      ...DEFAULT_BLOCKS,
    },
    rules: [
      globalTFunction,
      tFunction,
      useTranslate,
      tComponent,
      scriptTag,
      exportDefaultObject,
    ],
    merger: vueMergers,
    treeTransform: vueTreeTransform,
  });
};
