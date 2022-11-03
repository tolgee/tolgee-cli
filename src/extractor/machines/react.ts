import { createMachine, assign, send, forwardTo } from 'xstate';
import propertiesMachine from './shared/properties';

type HookVisibility = { depth: number; namespace?: string };
type Key = { keyName: string; defaultValue?: string; namespace?: string };
type MachineCtx = {
  blockDepth: number;
  createElement: boolean;
  isImmediateJsxClose: boolean;

  key: Key;
  hooks: HookVisibility[];
  keys: Key[];
};

export default createMachine<MachineCtx>(
  {
    predictableActionArguments: true,
    id: 'code',
    initial: 'idle',
    context: {
      blockDepth: 0,
      createElement: false,
      isImmediateJsxClose: false,

      key: { keyName: '' },
      hooks: [],
      keys: [],
    },
    states: {
      idle: {
        on: {
          'variable.other.object.ts': [
            // React.createElement (step 1)
            {
              target: 'react_call1',
              cond: (_ctx, evt) => evt.token === 'React',
            },
          ],
          'entity.name.function.ts': [
            // useTranslate call
            {
              target: 'hook_call',
              cond: (_ctx, evt) => evt.token === 'useTranslate',
            },

            // t call
            {
              target: 't_call',
              cond: (ctx, evt) => !!ctx.hooks.length && evt.token === 't',
            },
          ],
          // T JSX component
          'punctuation.definition.tag.begin.tsx': {
            target: 'jsx_element',
            cond: (_ctx, evt) => evt.token === '<',
          },
        },
      },

      react_call1: {
        // React.createElement (step 2)
        on: {
          '*': 'idle',
          'meta.function-call.ts': undefined,
          'punctuation.accessor.ts': 'react_call2',
        },
      },
      react_call2: {
        // React.createElement (step 3)
        on: {
          '*': 'idle',
          'meta.function-call.ts': undefined,
          'support.function.dom.ts': {
            target: 'create_element',
            cond: (_ctx, evt) => evt.token === 'createElement',
            actions: assign({ createElement: (_ctx, _evt) => true }),
          },
        },
      },
      jsx_element: {
        on: {
          '*': 'idle',
          'support.class.component.tsx': {
            target: 'params',
            actions: assign({ createElement: (_ctx, _evt) => true }),
            cond: (_ctx, evt) => evt.token === 'T',
          },
        },
      },

      // Extract params
      params: {
        invoke: {
          id: 'propertiesMachine',
          src: propertiesMachine,
          onDone: [
            {
              target: 'create_element_children',
              actions: [
                'consumeParameters',
                assign({ createElement: (_ctx, _evt) => false }),
              ],
              cond: (ctx, evt) =>
                ctx.createElement &&
                !ctx.isImmediateJsxClose &&
                ((!ctx.key.keyName && !evt.data.keyName) ||
                  (!ctx.key.defaultValue && !evt.data.defaultValue)),
            },
            {
              target: 'idle',
              actions: ['consumeParameters', 'pushKey'],
            },
          ],
        },
        on: {
          '*': {
            actions: [
              forwardTo('propertiesMachine'),
              assign({
                isImmediateJsxClose: (_ctx, evt) => evt.token === '/>',
              }),
            ],
          },
        },
      },

      // Process React.createElement
      create_element: {
        on: {
          '*': 'idle',

          // Void & punctuation
          'meta.brace.round.ts': undefined,

          // Component
          'variable.other.constant.ts': [
            {
              target: 'create_element_props',
              cond: (_ctx, evt) => evt.token === 'T',
            },
          ],
        },
      },
      create_element_props: {
        on: {
          'constant.language.null.ts': 'create_element_children',
          'punctuation.definition.block.ts': {
            target: 'params',
            actions: [
              assign({ createElement: (_ctx, _evt) => true }),
              send((_ctx, evt) => evt), // Replay event for child machine
            ],
            cond: (_ctx, evt) => evt.token === '{',
          },
        },
      },
      create_element_children: {
        on: {
          '*': {
            target: 'idle',
            actions: 'pushKey',
          },

          // Void & punctuation
          'meta.objectliteral.ts': undefined,
          'punctuation.separator.comma.ts': undefined,

          // String
          'punctuation.definition.string.begin.ts':
            'create_element_children_string',
          'punctuation.definition.string.template.begin.ts':
            'create_element_children_string',

          // JSX child
          'meta.jsx.children.tsx': [
            {
              target: 'idle',
              actions: ['storeKeyName', 'pushKey'],
              cond: (ctx) => !ctx.key.keyName,
            },
            {
              actions: 'appendKeyDefault',
              cond: (ctx) => !!ctx.key.keyName,
            },
          ],
        },
      },
      create_element_children_string: {
        on: {
          '*': [
            {
              target: 'idle',
              actions: ['storeKeyName', 'pushKey'],
              cond: (ctx) => !ctx.key.keyName,
            },
            {
              target: 'idle',
              actions: ['storeKeyDefault', 'pushKey'],
              cond: (ctx) => !!ctx.key.keyName,
            },
          ],
        },
      },

      // Process useTranslate call
      hook_call: {
        on: {
          'punctuation.definition.string.begin.ts': 'hook_set_ns',
          'punctuation.definition.string.template.begin.ts': 'hook_set_ns',
          'meta.brace.round.ts': {
            target: 'idle',
            cond: (_ctx, evt) => evt.token === ')',
            actions: 'pushHook',
          },
        },
      },
      hook_set_ns: {
        on: {
          '*': {
            target: 'idle',
            actions: 'pushNamespacedHook',
          },
        },
      },

      // Process t call
      t_call: {
        on: {
          'punctuation.definition.string.begin.ts': {
            target: 't_set_key',
          },
          'punctuation.definition.string.template.begin.ts': {
            target: 't_set_key',
          },
          'meta.brace.round.ts': {
            target: 'idle',
            cond: (_ctx, evt) => evt.token === ')',
          },
        },
      },
      t_set_key: {
        on: {
          '*': {
            target: 't_params',
            actions: ['storeKeyName', 'storeKeyCurrentNamespace'],
          },
        },
      },
      t_params: {
        on: {
          'meta.brace.round.ts': {
            target: 'idle',
            actions: 'pushKey',
            cond: (_ctx, evt) => evt.token === ')',
          },
          'punctuation.separator.comma.ts': {
            target: 'params',
          },
        },
      },
    },
    on: {
      'punctuation.definition.block.ts': [
        {
          cond: (_ctx, evt) => evt.token === '{',
          actions: 'incrementDepth',
        },
        {
          cond: (_ctx, evt) => evt.token === '}',
          actions: 'decrementDepth',
        },
      ],
    },
  },
  {
    actions: {
      incrementDepth: assign({
        blockDepth: (ctx) => ctx.blockDepth + 1,
      }),
      decrementDepth: assign({
        blockDepth: (ctx) => ctx.blockDepth - 1,
        hooks: (ctx) => ctx.hooks.filter((n) => n.depth !== ctx.blockDepth),
      }),

      pushHook: assign({
        hooks: (ctx) => [...ctx.hooks, { depth: ctx.blockDepth }],
      }),
      pushNamespacedHook: assign({
        hooks: (ctx, evt) => [
          ...ctx.hooks,
          { namespace: evt.token, depth: ctx.blockDepth },
        ],
      }),

      consumeParameters: assign({
        key: (ctx, evt) => ({
          keyName: evt.data.keyName ?? ctx.key.keyName,
          defaultValue: evt.data.defaultValue ?? ctx.key.defaultValue,
          namespace: evt.data.namespace ?? ctx.key.namespace,
        }),
      }),
      storeKeyName: assign({
        key: (ctx, evt) => ({ ...ctx.key, keyName: evt.token }),
      }),
      storeKeyDefault: assign({
        key: (ctx, evt) => ({ ...ctx.key, defaultValue: evt.token }),
      }),
      appendKeyDefault: assign({
        key: (ctx, evt) => ({
          ...ctx.key,
          defaultValue: (ctx.key.defaultValue ?? '') + evt.token,
        }),
      }),
      storeKeyCurrentNamespace: assign({
        key: (ctx, _evt) => ({
          ...ctx.key,
          namespace: ctx.hooks.length
            ? ctx.hooks[ctx.hooks.length - 1].namespace
            : void 0,
        }),
      }),

      pushKey: assign({
        keys: (ctx, _evt) => [
          ...ctx.keys,
          {
            keyName: ctx.key.keyName!.trim(),
            namespace: ctx.key.namespace?.trim(),
            defaultValue: ctx.key.defaultValue?.trim().replace(/\s+/g, ' '),
          },
        ],
        key: (_ctx, _evt) => ({ keyName: '' }),
      }),
    },
  }
);
