// This machine is responsible for decoding a Vue SFC file.
// It extracts the tokens in 3 different categories:
//  - The setup function tokens
//  - The scripts (excluding setup)
//  - The template
//
// Property of the machine: will always include an
// extra token for all categories. Consumers must be
// aware of this!

import type { Token } from '../../tokenizer.js';
import { createMachine, assign } from 'xstate';

type VueDecoderContext = {
  setup: Token[];
  script: Token[];
  template: Token[];

  scriptSetupConsumed: boolean;
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
      invalidSetup: null,
      depth: 0,
      memoizedDepth: 0,
    },
    states: {
      idle: {
        on: {
          'punctuation.definition.tag.begin.html.vue': 'beginTag',
        },
      },
      beginTag: {
        on: {
          'entity.name.tag.script.html.vue': 'scriptTag',
          'entity.name.tag.template.html.vue': {
            cond: (_, evt) => evt.token === 'template',
            actions: 'incrementDepth',
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
          'punctuation.definition.tag.end.html.vue': 'script',
        },
      },
      scriptSetupTag: {
        on: {
          'punctuation.definition.tag.end.html.vue': 'setup',
        },
      },
      templateTag: {
        on: {
          'punctuation.definition.tag.end.html.vue': 'template',
        },
      },

      setup: {
        on: {
          '*': { actions: ['consumeSetupToken'] },
          'entity.name.tag.script.html.vue': 'idle',
        },
      },
      script: {
        on: {
          '*': { actions: ['consumeScriptToken'] },
          'meta.export.default.ts': {
            actions: ['resetDepth'],
            target: 'scriptExport',
          },
          'entity.name.tag.script.html.vue': 'idle',
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
          'entity.name.tag.script.html.vue': 'idle',
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
          'punctuation.definition.tag.begin.html.vue': {
            cond: (_, evt) => evt.token === '<',
            target: 'nestedTemplateTag',
          },
          'entity.name.tag.template.html.vue': [
            {
              cond: (ctx, evt) => evt.token === 'template' && ctx.depth === 1,
              actions: 'decrementDepth',
              target: 'idle',
            },
            {
              cond: (_, evt) => evt.token === 'template',
              actions: 'decrementDepth',
            },
          ],
        },
      },
      nestedTemplateTag: {
        on: {
          'entity.name.tag.template.html.vue': [
            {
              cond: (_, evt) => evt.token === 'template',
              actions: 'incrementDepth',
              target: 'template',
            },
            {
              target: 'template',
            },
          ],
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
