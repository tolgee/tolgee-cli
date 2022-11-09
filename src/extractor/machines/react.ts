import { createMachine, assign, send, forwardTo } from 'xstate';
import propertiesMachine from './shared/properties';

type HookVisibility = { depth: number; namespace?: string };
type Key = { keyName: string; defaultValue?: string; namespace?: string };
type MachineCtx = {
  blockDepth: number;
  children: string;

  key: Key;
  hooks: HookVisibility[];
  keys: Key[];
};

export default createMachine<MachineCtx>(
  {
    predictableActionArguments: true,
    id: 'reactExtractor',
    type: 'parallel',
    context: {
      blockDepth: 0,
      children: '',

      key: { keyName: '' },
      hooks: [],
      keys: [],
    },
    states: {
      useTranslate: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'entity.name.function.ts': {
                target: 'func',
                cond: (_ctx, evt) => evt.token === 'useTranslate',
              },
            },
          },
          func: {
            on: {
              '*': 'idle',
              'meta.block.ts': undefined,
              'meta.var.expr.ts': undefined,
              'meta.brace.round.ts': {
                target: 'call',
                cond: (_ctx, evt) => evt.token === '(',
              },
            },
          },
          call: {
            on: {
              'punctuation.definition.string.begin.ts': 'namespace',
              'punctuation.definition.string.template.begin.ts': 'namespace',
              'meta.brace.round.ts': {
                target: 'idle',
                cond: (_ctx, evt) => evt.token === ')',
                actions: 'pushHook',
              },
            },
          },
          namespace: {
            on: {
              '*': {
                target: 'idle',
                actions: 'pushNamespacedHook',
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

      createElement: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'variable.other.object.ts': {
                target: 'func1',
                cond: (_ctx, evt) => evt.token === 'React',
              },
            },
          },
          func1: {
            on: {
              '*': 'idle',
              'meta.function-call.ts': undefined,
              'punctuation.accessor.ts': {
                target: 'func2',
                cond: (_ctx, evt) => evt.token === '.',
              },
            },
          },
          func2: {
            on: {
              '*': 'idle',
              'meta.function-call.ts': undefined,
              'support.function.dom.ts': {
                target: 'func3',
                cond: (_ctx, evt) => evt.token === 'createElement',
              },
            },
          },
          func3: {
            on: {
              '*': 'idle',
              'meta.function-call.ts': undefined,
              'meta.brace.round.ts': {
                target: 'call',
                cond: (_ctx, evt) => evt.token === '(',
              },
            },
          },
          call: {
            on: {
              '*': 'idle',
              'variable.other.constant.ts': {
                target: 'props',
                cond: (_ctx, evt) => evt.token === 'T',
              },
            },
          },
          props: {
            on: {
              'constant.language.null.ts': 'children',
              'punctuation.definition.block.ts': {
                target: 'props_object',
                // Replay event for child machine
                actions: send((_ctx, evt) => evt),
                cond: (_ctx, evt) => evt.token === '{',
              },
            },
          },
          props_object: {
            invoke: {
              id: 'propertiesMachine',
              src: propertiesMachine,
              onDone: [
                {
                  target: 'children',
                  actions: 'consumeParameters',
                  cond: (ctx, evt) =>
                    (!ctx.key.keyName && !evt.data.keyName) ||
                    (!ctx.key.defaultValue && !evt.data.defaultValue),
                },
                {
                  target: 'idle',
                  actions: ['consumeParameters', 'pushKey'],
                },
              ],
            },
            on: {
              '*': {
                actions: forwardTo('propertiesMachine'),
              },
            },
          },
          children: {
            on: {
              '*': [
                {
                  target: 'idle',
                  actions: 'pushKey',
                  cond: (ctx) => !!ctx.key.keyName,
                },
                {
                  target: 'idle',
                },
              ],

              // Void & punctuation
              'meta.objectliteral.ts': undefined,
              'punctuation.separator.comma.ts': undefined,

              // String
              'punctuation.definition.string.begin.ts': 'children_string',
              'punctuation.definition.string.template.begin.ts':
                'children_string',
            },
          },
          children_string: {
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
        },
      },
      jsx: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'punctuation.definition.tag.begin.tsx': {
                target: 'tag',
                cond: (_ctx, evt) => evt.token === '<',
              },
            },
          },
          tag: {
            on: {
              '*': 'idle',
              'meta.tag.ts': undefined,
              'support.class.component.tsx': {
                target: 'props',
                cond: (_ctx, evt) => evt.token === 'T',
              },
            },
          },
          props: {
            invoke: {
              id: 'propertiesMachine',
              src: propertiesMachine,
              onDone: [
                {
                  target: 'children',
                  actions: 'consumeParameters',
                  cond: (ctx, evt) =>
                    evt.data.lastEvent.token !== '/>' &&
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
                actions: forwardTo('propertiesMachine'),
              },
            },
          },
          children: {
            on: {
              'punctuation.definition.tag.begin.tsx': {
                target: 'idle',
                actions: ['consumeChildren', 'pushKey'],
              },

              'meta.jsx.children.tsx': {
                actions: 'appendChildren',
              },
              'string.quoted.single.ts': {
                actions: 'appendChildren',
              },
              'string.quoted.double.ts': {
                actions: 'appendChildren',
              },
              'string.template.ts': {
                actions: 'appendChildren',
              },
            },
          },
        },
      },
      t: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'entity.name.function.ts': {
                target: 'func',
                cond: (ctx, evt) => !!ctx.hooks.length && evt.token === 't',
              },
            },
          },
          func: {
            on: {
              '*': 'idle',
              'meta.block.ts': undefined,
              'meta.var.expr.ts': undefined,
              'meta.brace.round.ts': {
                target: 'call',
                cond: (_ctx, evt) => evt.token === '(',
              },
            },
          },
          call: {
            on: {
              'punctuation.definition.string.begin.ts': 'param_string',
              'punctuation.definition.string.template.begin.ts': 'param_string',
              'punctuation.definition.block.ts': {
                target: 'param_object',
                // Replay event for child machine
                actions: send((_ctx, evt) => evt),
                cond: (_ctx, evt) => evt.token === '{',
              },
              'meta.brace.round.ts': {
                target: 'idle',
                cond: (_ctx, evt) => evt.token === ')',
                actions: 'pushKey',
              },
            },
          },
          param_string: {
            on: {
              '*': [
                {
                  target: 'call',
                  actions: ['storeKeyName', 'storeKeyCurrentNamespace'],
                  cond: (ctx) => !ctx.key.keyName,
                },
                {
                  target: 'call',
                  actions: ['storeKeyDefault', 'storeKeyCurrentNamespace'],
                  cond: (ctx) => !!ctx.key.keyName,
                },
              ],
            },
          },
          param_object: {
            invoke: {
              id: 'propertiesMachine',
              src: propertiesMachine,
              onDone: {
                target: 'idle',
                actions: ['consumeParameters', 'pushKey'],
              },
            },
            on: {
              '*': {
                actions: forwardTo('propertiesMachine'),
              },
            },
          },
        },
      },
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
          // We don't want the key and default value to be overridable
          // But we DO want the namespace to be overridable
          keyName: ctx.key.keyName || evt.data.keyName,
          defaultValue: ctx.key.defaultValue || evt.data.defaultValue,
          namespace: evt.data.namespace ?? ctx.key.namespace,
        }),
      }),

      appendChildren: assign({
        children: (ctx, evt) => (ctx.children ?? '') + evt.token,
      }),
      consumeChildren: assign({
        key: (ctx, _evt) => ({
          ...ctx.key,
          keyName: ctx.key.keyName ? ctx.key.keyName : ctx.children,
          defaultValue: !ctx.key.keyName ? ctx.key.defaultValue : ctx.children,
        }),
        children: (_ctx, _evt) => '',
      }),

      storeKeyName: assign({
        key: (ctx, evt) => ({ ...ctx.key, keyName: evt.token }),
      }),
      storeKeyDefault: assign({
        key: (ctx, evt) => ({ ...ctx.key, defaultValue: evt.token }),
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
