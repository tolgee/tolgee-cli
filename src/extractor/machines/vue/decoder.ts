// This machine is responsible for decoding a Vue SFC file.
// It extracts the tokens in 3 different categories:
//  - The setup function tokens
//  - The scripts (excluding setup)
//  - The template
//
// It can request tokens from other files to the callee.

import type { Token } from '../../tokenizer.js';
import { createMachine, assign } from 'xstate';

type VueDecoderContext = {
  setup: Token[];
  script: Token[];
  template: Token[];

  scriptSetupConsumed: boolean;
  scriptProvenance: string | null;
  templateProvenance: string | null;
  invalidSetup: number | null;

  depth: number;
  memoizedDepth: number;
};

// This state machine is responsible for extracting translation key properties from an object/props
export default createMachine<VueDecoderContext, Token>(
  {
    predictableActionArguments: true,
    id: 'properties',
    initial: 'idle',
    context: {
      setup: [],
      script: [],
      template: [],
      scriptSetupConsumed: false, // <script setup>
      scriptProvenance: null,
      templateProvenance: null,
      invalidSetup: null,
      depth: 0,
      memoizedDepth: 0,
    },
    states: {
      idle: {
        on: {
          'punctuation.definition.tag.begin.html': 'beginTag',
        },
      },
      beginTag: {
        on: {
          'entity.name.tag.script.html': 'scriptTag',
          'entity.name.tag.template.html': {
            cond: (_, evt) => evt.token === 'template',
            target: 'templateTag',
          },
          '*': 'idle',
        },
      },
      scriptTag: {
        on: {
          'entity.other.attribute-name.html': [
            {
              cond: (_, evt) => evt.token === 'setup',
              actions: ['consumeSetupScript'],
              target: 'scriptSetupTag',
            },
          ],
          'punctuation.definition.tag.end.html': 'script',
        },
      },
      scriptSetupTag: {
        on: {
          'punctuation.definition.tag.end.html': 'setup',
        },
      },
      templateTag: {
        on: {
          'source.vue': {
            cond: (_, evt) => evt.token[0] === '>',
            target: 'template',
          },
        },
      },

      setup: {
        on: {
          '*': { actions: ['consumeSetupToken'] },
          'entity.name.tag.script.html': 'idle',
        },
      },
      script: {
        on: {
          '*': { actions: ['consumeScriptToken'] },
          'meta.export.default.ts': {
            actions: ['resetDepth'],
            target: 'scriptExport',
          },
          'entity.name.tag.script.html': 'idle',
        },
      },
      scriptExport: {
        on: {
          '*': { actions: ['consumeScriptToken'] },
          'punctuation.definition.block.ts': [
            {
              cond: (_, evt) => evt.token === '{',
              actions: ['incrementDepth'],
            },
            {
              cond: (_, evt) => evt.token === '}',
              actions: ['decrementDepth'],
            },
          ],
          'entity.name.function.ts': {
            cond: (_, evt) => evt.token === 'setup',
            actions: ['storeDepth'],
            target: 'scriptSetup',
          },
          'meta.object-literal.key.ts': {
            cond: (_, evt) => evt.token === 'setup',
            actions: ['markBadSetupUse'],
          },
          'entity.name.tag.script.html': 'idle',
        },
      },
      scriptSetup: {
        on: {
          '*': {
            cond: (ctx) => !ctx.scriptSetupConsumed,
            actions: ['consumeSetupToken'],
          },
          'punctuation.definition.block.ts': [
            {
              cond: (_, evt) => evt.token === '{',
              actions: ['consumeSetupToken', 'incrementDepth'],
            },
            {
              cond: (ctx, evt) =>
                evt.token === '}' && ctx.depth - 1 === ctx.memoizedDepth,
              actions: ['consumeSetupToken', 'decrementDepth'],
              target: 'scriptExport',
            },
            {
              cond: (_, evt) => evt.token === '}',
              actions: ['consumeSetupToken', 'decrementDepth'],
            },
          ],
        },
      },
      template: {
        on: {
          '*': { actions: ['consumeTemplateToken'] },
          'entity.other.attribute-name.html': {
            cond: (_, evt) => evt.token === 'template',
            target: 'idle',
          },
        },
      },
    },
  },
  {
    actions: {
      consumeSetupScript: assign({
        setup: () => [],
        scriptSetupConsumed: () => true,
      }),

      consumeSetupToken: assign({
        setup: (ctx, evt) => [...ctx.setup, evt],
      }),
      consumeScriptToken: assign({
        script: (ctx, evt) => [...ctx.script, evt],
      }),
      consumeTemplateToken: assign({
        template: (ctx, evt) => [...ctx.template, evt],
      }),

      resetDepth: assign({
        depth: () => 0,
      }),
      incrementDepth: assign({
        depth: (ctx) => ctx.depth + 1,
      }),
      decrementDepth: assign({
        depth: (ctx) => ctx.depth - 1,
      }),
      storeDepth: assign({
        memoizedDepth: (ctx) => ctx.depth,
      }),

      markBadSetupUse: assign({
        invalidSetup: (_, evt) => evt.line,
      }),
    },
  }
);
