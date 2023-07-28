// This machine is responsible for extracting data from
// calls to `t`. It is shared across multiple machines since
// all t functions share the same signature.

import { createMachine, send, assign, forwardTo } from 'xstate';
import propertiesMachine from './properties.js';

type TranslateCallContext = {
  keyName: string | false | null;
  defaultValue: string | false | null;
  namespace: string | false | null;
  dynamicOptions: boolean;
};

export default createMachine<TranslateCallContext>(
  {
    predictableActionArguments: true,
    id: 'tCall',
    initial: 'idle',
    context: {
      keyName: null,
      defaultValue: null,
      namespace: null,
      dynamicOptions: false,
    },
    states: {
      idle: {
        on: {
          'punctuation.definition.string.begin.ts': 'string',
          'punctuation.definition.string.template.begin.ts': 'string',
          'variable.other.readwrite.ts': [
            {
              target: 'done',
              actions: 'dynamicOptions',
              cond: (ctx) => !!ctx.keyName,
            },
            {
              target: 'done',
              actions: 'dynamicKeyName',
            },
          ],
          'punctuation.definition.block.ts': {
            target: 'object',
            cond: (_ctx, evt) => evt.token === '{',
          },
          'meta.brace.round.ts': {
            target: 'done',
            cond: (_ctx, evt) => evt.token === ')',
          },
        },
      },

      string: {
        on: {
          '*': [
            {
              target: 'string_end',
              actions: 'storeKeyName',
              cond: (ctx) => !ctx.keyName,
            },
            {
              target: 'string_end',
              actions: 'storeDefaultValue',
              cond: (ctx) => !!ctx.keyName,
            },
          ],
        },
      },
      string_end: {
        on: {
          'punctuation.separator.comma.ts': 'idle',
          'punctuation.definition.template-expression.begin.ts': [
            {
              target: 'string_end_warn',
              actions: 'dynamicDefaultValue',
              cond: (ctx) => !!ctx.defaultValue,
            },
            {
              target: 'done',
              actions: 'dynamicKeyName',
            },
          ],
          'keyword.operator.arithmetic.ts': [
            {
              target: 'string_end_warn',
              actions: 'dynamicDefaultValue',
              cond: (ctx) => !!ctx.defaultValue,
            },
            {
              target: 'done',
              actions: 'dynamicKeyName',
            },
          ],
          'meta.brace.round.ts': {
            target: 'done',
            cond: (_ctx, evt) => evt.token === ')',
          },
        },
      },
      string_end_warn: {
        on: {
          'punctuation.separator.comma.ts': 'idle',
          'meta.brace.round.ts': {
            target: 'done',
            cond: (_ctx, evt) => evt.token === ')',
          },
        },
      },

      object: {
        invoke: {
          id: 'propertiesMachine',
          src: propertiesMachine,
          data: {
            depth: 1,
          },
          onDone: {
            target: 'done',
            actions: 'consumeParameters',
          },
        },
        on: {
          '*': {
            actions: forwardTo('propertiesMachine'),
          },
        },
      },

      done: { type: 'final', data: (ctx) => ctx },
    },
  },
  {
    actions: {
      storeKeyName: assign({
        keyName: (_, evt) => evt.token,
      }),
      storeDefaultValue: assign({
        defaultValue: (_, evt) => evt.token,
      }),

      consumeParameters: assign({
        keyName: (ctx, evt) =>
          ctx.keyName === null ? evt.data.keyName : ctx.keyName,
        namespace: (ctx, evt) =>
          ctx.namespace === null ? evt.data.namespace : ctx.namespace,
        defaultValue: (ctx, evt) =>
          ctx.defaultValue === null ? evt.data.defaultValue : ctx.defaultValue,
      }),

      dynamicKeyName: assign({
        keyName: () => false,
      }),
      dynamicDefaultValue: assign({
        defaultValue: () => false,
      }),
      dynamicOptions: assign({
        dynamicOptions: () => true,
      }),
    },
  }
);
