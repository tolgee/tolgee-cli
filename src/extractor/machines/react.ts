import type { ExtractedKey, Warning } from '../index.js';

import { createMachine, assign, send, forwardTo } from 'xstate';
import propertiesMachine from './shared/properties';
import commentsService from './shared/comments';

type HookVisibility = { depth: number; namespace?: string | false };

type KeyWithDynamicNs = Omit<ExtractedKey, 'namespace'> & {
  namespace?: ExtractedKey['namespace'] | false;
};

type MachineCtx = {
  blockDepth: number;
  children: string;
  line: number;

  key: KeyWithDynamicNs;
  hooks: HookVisibility[];
  ignore: null | { type: 'key' | 'ignore'; line: number };

  keys: ExtractedKey[];
  warnings: Warning[];
};

const VOID_KEY = { keyName: '', line: -1 };

export default createMachine<MachineCtx>(
  {
    predictableActionArguments: true,
    id: 'reactExtractor',
    type: 'parallel',
    context: {
      blockDepth: 0,
      children: '',
      line: 0,

      key: VOID_KEY,
      hooks: [],
      ignore: null,

      keys: [],
      warnings: [],
    },
    states: {
      comments: {
        invoke: {
          id: 'comments',
          src: () => commentsService,
        },
        on: {
          // Service messages
          MAGIC_COMMENT: [
            {
              actions: 'ignoreNextLine',
              cond: (_ctx, evt) => evt.kind === 'ignore',
            },
            {
              actions: 'pushImmediateKey',
              cond: (_ctx, evt) => evt.kind === 'key',
            },
          ],
          WARNING: {
            actions: 'pushWarning',
          },

          // Code messages
          'comment.line.double-slash.ts': {
            actions: send(
              (_ctx, evt) => ({
                type: 'COMMENT',
                data: evt.token,
                line: evt.line,
              }),
              { to: 'comments' }
            ),
          },
          'comment.block.ts': {
            actions: send(
              (_ctx, evt) => ({
                type: 'COMMENT',
                data: evt.token,
                line: evt.line,
              }),
              { to: 'comments' }
            ),
          },
          newline: {
            actions: 'warnUnusedIgnore',
            cond: (ctx, evt) =>
              ctx.ignore?.type === 'ignore' && ctx.ignore.line === evt.line,
          },
        },
      },
      useTranslate: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'entity.name.function.ts': {
                target: 'func',
                actions: 'storeLine',
                cond: (_ctx, evt) => evt.token === 'useTranslate',
              },
            },
          },
          func: {
            on: {
              '*': 'idle',
              newline: undefined,
              'meta.block.ts': undefined,
              'meta.var.expr.ts': undefined,
              'meta.brace.round.ts': [
                {
                  target: 'idle',
                  actions: 'consumeIgnoredLine',
                  cond: (ctx, evt) =>
                    ctx.ignore?.line === ctx.line &&
                    ctx.ignore.type === 'ignore' &&
                    evt.token === '(',
                },
                {
                  target: 'call',
                  cond: (_ctx, evt) => evt.token === '(',
                },
              ],
            },
          },
          call: {
            on: {
              'punctuation.definition.string.begin.ts': 'namespace',
              'punctuation.definition.string.template.begin.ts': 'namespace',
              'variable.other.readwrite.ts': {
                target: 'idle',
                actions: ['pushHook', 'markHookAsDynamic'],
              },
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
                target: 'namespace_end',
                actions: 'pushNamespacedHook',
              },
            },
          },
          namespace_end: {
            on: {
              'punctuation.separator.comma.ts': 'idle',
              'meta.brace.round.ts': 'idle',
              'punctuation.definition.template-expression.begin.ts': {
                target: 'idle',
                actions: 'markHookAsDynamic',
              },
              'keyword.operator.arithmetic.ts': {
                target: 'idle',
                actions: 'markHookAsDynamic',
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
                actions: 'storeLine',
                cond: (_ctx, evt) => evt.token === 'React',
              },
            },
          },
          func1: {
            on: {
              '*': 'idle',
              newline: undefined,
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
              newline: undefined,
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
              newline: undefined,
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
              newline: undefined,
              'variable.other.constant.ts': [
                {
                  target: 'idle',
                  actions: 'consumeIgnoredLine',
                  cond: (ctx, evt) =>
                    ctx.ignore?.line === ctx.line && evt.token === 'T',
                },
                {
                  target: 'props',
                  cond: (_ctx, evt) => evt.token === 'T',
                },
              ],
            },
          },
          props: {
            on: {
              'constant.language.null.ts': 'children',
              'punctuation.definition.block.ts': {
                target: 'props_object',
                cond: (_ctx, evt) => evt.token === '{',
              },
            },
          },
          props_object: {
            invoke: {
              id: 'propertiesMachine',
              src: propertiesMachine,
              data: {
                depth: 1,
              },
              onDone: [
                {
                  target: 'idle',
                  actions: 'emitWarningFromParameters',
                  cond: 'isPropertiesDataDynamic',
                },
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

              'variable.other.readwrite.ts': {
                target: 'idle',
                actions: ['dynamicKeyDefault', 'pushKey'],
              },

              // Void & punctuation
              newline: undefined,
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
                  target: 'children_end',
                  actions: 'storeKeyName',
                  cond: (ctx) => !ctx.key.keyName,
                },
                {
                  target: 'children_end',
                  actions: 'storeKeyDefault',
                  cond: (ctx) => !!ctx.key.keyName,
                },
              ],
            },
          },
          children_end: {
            on: {
              'punctuation.separator.comma.ts': {
                target: 'idle',
                actions: 'pushKey',
              },
              'meta.brace.round.ts': {
                target: 'idle',
                actions: 'pushKey',
              },
              'punctuation.definition.template-expression.begin.ts': {
                target: 'idle',
                actions: ['dynamicKeyDefault', 'pushKey'],
              },
              'keyword.operator.arithmetic.ts': {
                target: 'idle',
                actions: ['dynamicKeyDefault', 'pushKey'],
              },
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
                actions: 'storeLine',
                cond: (_ctx, evt) => evt.token === '<',
              },
            },
          },
          tag: {
            on: {
              '*': 'idle',
              newline: undefined,
              'meta.tag.ts': undefined,
              'support.class.component.tsx': [
                {
                  target: 'idle',
                  actions: 'consumeIgnoredLine',
                  cond: (ctx, evt) =>
                    ctx.ignore?.line === ctx.line && evt.token === 'T',
                },
                {
                  target: 'props',
                  cond: (_ctx, evt) => evt.token === 'T',
                },
              ],
            },
          },
          props: {
            invoke: {
              id: 'propertiesMachine',
              src: propertiesMachine,
              onDone: [
                {
                  target: 'idle',
                  actions: 'emitWarningFromParameters',
                  cond: 'isPropertiesDataDynamic',
                },
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

              'variable.other.readwrite.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'variable.other.object.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'entity.name.function.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'storage.type.function.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'storage.type.class.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'keyword.operator.new.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'punctuation.definition.block.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'punctuation.definition.template-expression.begin.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
              },
              'keyword.operator.arithmetic.ts': {
                target: 'idle',
                actions: ['dynamicChildren', 'pushKey'],
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
                actions: 'storeLine',
                cond: (ctx, evt) => !!ctx.hooks.length && evt.token === 't',
              },
            },
          },
          func: {
            on: {
              '*': 'idle',
              newline: undefined,
              'meta.block.ts': undefined,
              'meta.var.expr.ts': undefined,
              'meta.brace.round.ts': [
                {
                  target: 'idle',
                  actions: 'consumeIgnoredLine',
                  cond: (ctx, evt) =>
                    ctx.ignore?.line === ctx.line && evt.token === '(',
                },
                {
                  target: 'call',
                  cond: (_ctx, evt) => evt.token === '(',
                },
              ],
            },
          },
          call: {
            on: {
              'punctuation.definition.string.begin.ts': 'param_string',
              'punctuation.definition.string.template.begin.ts': 'param_string',
              'variable.other.readwrite.ts': [
                {
                  target: 'idle',
                  actions: 'dynamicOptions',
                  cond: (ctx) => !!ctx.key.keyName,
                },
                {
                  target: 'idle',
                  actions: 'dynamicKeyName',
                },
              ],
              'punctuation.definition.block.ts': {
                target: 'param_object',
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
                  target: 'param_end',
                  actions: ['storeKeyName', 'storeKeyCurrentNamespace'],
                  cond: (ctx) => !ctx.key.keyName,
                },
                {
                  target: 'param_end',
                  actions: ['storeKeyDefault', 'storeKeyCurrentNamespace'],
                  cond: (ctx) => !!ctx.key.keyName,
                },
              ],
            },
          },
          param_end: {
            on: {
              'punctuation.separator.comma.ts': 'call',
              'punctuation.definition.template-expression.begin.ts': [
                {
                  target: 'param_end_warn',
                  actions: 'dynamicKeyDefault',
                  cond: (ctx) => !!ctx.key.defaultValue,
                },
                {
                  target: 'idle',
                  actions: 'dynamicKeyName',
                },
              ],
              'keyword.operator.arithmetic.ts': [
                {
                  target: 'param_end_warn',
                  actions: 'dynamicKeyDefault',
                  cond: (ctx) => !!ctx.key.defaultValue,
                },
                {
                  target: 'idle',
                  actions: 'dynamicKeyName',
                },
              ],
              'meta.brace.round.ts': {
                target: 'idle',
                cond: (_ctx, evt) => evt.token === ')',
                actions: 'pushKey',
              },
            },
          },
          param_end_warn: {
            on: {
              'punctuation.separator.comma.ts': 'call',
              'meta.brace.round.ts': {
                target: 'idle',
                cond: (_ctx, evt) => evt.token === ')',
                actions: 'pushKey',
              },
            },
          },
          param_object: {
            invoke: {
              id: 'propertiesMachine',
              src: propertiesMachine,
              data: {
                depth: 1,
              },
              onDone: [
                {
                  target: 'idle',
                  actions: 'emitWarningFromParameters',
                  cond: 'isPropertiesDataDynamic',
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
        },
      },
    },
  },
  {
    guards: {
      isPropertiesDataDynamic: (_ctx, evt) =>
        evt.data.keyName === false || evt.data.namespace === false,
    },
    actions: {
      incrementDepth: assign({
        blockDepth: (ctx) => ctx.blockDepth + 1,
      }),
      decrementDepth: assign({
        blockDepth: (ctx) => ctx.blockDepth - 1,
        hooks: (ctx) => ctx.hooks.filter((n) => n.depth !== ctx.blockDepth),
      }),
      storeLine: assign({
        line: (_ctx, evt) => evt.line,
      }),

      ignoreNextLine: assign({
        ignore: (_ctx, evt) => ({ type: 'ignore', line: evt.line + 1 }),
      }),
      consumeIgnoredLine: assign({
        ignore: (_ctx, _evt) => null,
      }),
      warnUnusedIgnore: assign({
        warnings: (ctx, evt) => [
          ...ctx.warnings,
          { warning: 'W_UNUSED_IGNORE', line: evt.line - 1 },
        ],
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
      markHookAsDynamic: assign({
        hooks: (ctx, _evt) => [
          ...ctx.hooks.slice(0, -1),
          { namespace: false, depth: ctx.blockDepth },
        ],
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_NAMESPACE', line: ctx.line },
        ],
      }),

      consumeParameters: assign({
        key: (ctx, evt) => ({
          // We don't want the key and default value to be overridable
          // But we DO want the namespace to be overridable
          keyName: ctx.key.keyName || evt.data.keyName,
          defaultValue:
            ctx.key.defaultValue || evt.data.defaultValue || undefined,
          namespace:
            evt.data.namespace === ''
              ? undefined
              : evt.data.namespace ?? ctx.key.namespace,
          line: ctx.line,
        }),
        warnings: (ctx, evt) => {
          if (evt.data.defaultValue !== false) return ctx.warnings;
          return [
            ...ctx.warnings,
            { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: ctx.line },
          ];
        },
      }),
      emitWarningFromParameters: assign({
        warnings: (ctx, evt) => [
          ...ctx.warnings,
          {
            warning:
              evt.data.keyName === false
                ? 'W_DYNAMIC_KEY'
                : 'W_DYNAMIC_NAMESPACE',
            line: ctx.line,
          },
        ],
        key: (_ctx, _evt) => VOID_KEY,
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

      dynamicKeyName: assign({
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_KEY', line: ctx.line },
        ],
        key: (_ctx, _evt) => VOID_KEY,
      }),
      dynamicKeyDefault: assign({
        key: (ctx, _evt) => ({ ...ctx.key, defaultValue: undefined }),
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: ctx.line },
        ],
      }),
      dynamicOptions: assign({
        key: (ctx, _evt) => VOID_KEY,
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_OPTIONS', line: ctx.line },
        ],
      }),
      dynamicChildren: assign({
        key: (ctx, _evt) =>
          ctx.key.keyName ? { ...ctx.key, defaultValue: undefined } : VOID_KEY,
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          {
            warning: ctx.key.keyName
              ? 'W_DYNAMIC_DEFAULT_VALUE'
              : 'W_DYNAMIC_KEY',
            line: ctx.line,
          },
        ],
      }),

      pushKey: assign({
        warnings: (ctx, _evt) => {
          if (!ctx.key.keyName || ctx.key.namespace !== false)
            return ctx.warnings;
          return [
            ...ctx.warnings,
            { warning: 'W_UNRESOLVABLE_NAMESPACE', line: ctx.line },
          ];
        },
        keys: (ctx, _evt) => {
          if (!ctx.key.keyName || ctx.key.namespace === false) return ctx.keys;
          return [
            ...ctx.keys,
            {
              keyName: ctx.key.keyName.trim(),
              namespace: ctx.key.namespace?.trim(),
              defaultValue: ctx.key.defaultValue?.trim().replace(/\s+/g, ' '),
              line: ctx.line,
            },
          ];
        },
        key: (_ctx, _evt) => ({ keyName: '', line: 0 }),
      }),
      pushImmediateKey: assign({
        ignore: (_ctx, evt) => ({ type: 'key', line: evt.line + 1 }),
        keys: (ctx, evt) => [
          ...ctx.keys,
          {
            keyName: evt.keyName,
            namespace: evt.namespace,
            defaultValue: evt.defaultValue,
            line: evt.line,
          },
        ],
      }),
      pushWarning: assign({
        warnings: (ctx, evt) => [
          ...ctx.warnings,
          { warning: evt.kind, line: evt.line },
        ],
      }),
    },
  }
);
