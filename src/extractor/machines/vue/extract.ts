import type { ExtractedKey, Warning } from '../../index.js';

import { createMachine, assign, send, forwardTo } from 'xstate';
import translateCallMachine from '../shared/translateCall.js';
import propertiesMachine from '../shared/properties.js';
import commentsService from '../shared/comments.js';

type KeyWithDynamicNs = Omit<ExtractedKey, 'namespace'> & {
  namespace?: ExtractedKey['namespace'] | false;
};

const enum State {
  EXTERNAL,
  SETUP,
  SCRIPT,
  TEMPLATE,
}

type MachineCtx = {
  line: number;

  key: KeyWithDynamicNs;
  useTranslate: string | null | false;
  ignore: null | { type: 'key' | 'ignore'; line: number };

  currentState: State;

  keys: ExtractedKey[];
  warnings: Warning[];
};

const VOID_KEY = { keyName: '', line: -1 };

export default createMachine<MachineCtx>(
  {
    predictableActionArguments: true,
    id: 'vueExtractor',
    type: 'parallel',
    context: {
      line: 0,

      key: VOID_KEY,
      useTranslate: null,
      ignore: null,

      currentState: State.EXTERNAL,

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
          'comment.block.html': {
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
                cond: (ctx, evt) =>
                  (ctx.currentState === State.SETUP ||
                    ctx.currentState === State.EXTERNAL) &&
                  evt.token === 'useTranslate',
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
                actions: ['storeUseTranslate', 'markUseTranslateAsDynamic'],
              },
              'meta.brace.round.ts': {
                target: 'idle',
                cond: (_ctx, evt) => evt.token === ')',
                actions: 'storeUseTranslate',
              },
            },
          },
          namespace: {
            on: {
              '*': {
                target: 'namespace_end',
                actions: 'storeNamespacedUseTranslate',
              },
            },
          },
          namespace_end: {
            on: {
              'punctuation.separator.comma.ts': 'idle',
              'meta.brace.round.ts': 'idle',
              'punctuation.definition.template-expression.begin.ts': {
                target: 'idle',
                actions: 'markUseTranslateAsDynamic',
              },
              'keyword.operator.arithmetic.ts': {
                target: 'idle',
                actions: 'markUseTranslateAsDynamic',
              },
            },
          },
          done: { type: 'final' },
        },
      },

      t: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'variable.other.object.ts': {
                target: 'tRef',
                actions: 'storeLine',
                cond: (ctx, evt) =>
                  ctx.currentState !== State.SCRIPT &&
                  ctx.currentState !== State.TEMPLATE &&
                  ctx.useTranslate !== null &&
                  evt.token === 't',
              },
              'entity.name.function.ts': [
                {
                  target: 'func',
                  actions: 'storeLine',
                  cond: (ctx, evt) =>
                    ctx.currentState === State.TEMPLATE &&
                    ctx.useTranslate !== null &&
                    evt.token === 't',
                },
                {
                  target: 'func',
                  actions: 'storeLine',
                  cond: (ctx, evt) =>
                    ctx.currentState === State.TEMPLATE && evt.token === '$t',
                },
              ],
              'variable.language.this.ts': {
                cond: (ctx) =>
                  ctx.currentState !== State.TEMPLATE &&
                  ctx.currentState !== State.EXTERNAL,
                actions: 'storeLine',
                target: 'this',
              },
            },
          },
          this: {
            on: {
              'meta.function-call.ts': undefined,
              'punctuation.accessor.ts': 'thisDot',
              '*': 'idle',
            },
          },
          thisDot: {
            on: {
              'meta.function-call.ts': undefined,
              'entity.name.function.ts': {
                cond: (_, evt) => evt.token === '$t',
                target: 'func',
              },
            },
          },

          tRef: {
            on: {
              'meta.function-call.ts': undefined,
              'punctuation.accessor.ts': 'tRefDot',
              '*': 'idle',
            },
          },
          tRefDot: {
            on: {
              'meta.function-call.ts': undefined,
              'entity.name.function.ts': {
                cond: (_, evt) => evt.token === 'value',
                target: 'func',
              },
            },
          },

          func: {
            on: {
              '*': 'idle',
              newline: undefined,
              'source.ts': undefined,
              'source.ts.embedded.html.vue': undefined,
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
            invoke: {
              id: 'tCall',
              src: translateCallMachine,
              onDone: [
                {
                  target: 'idle',
                  actions: 'dynamicKeyName',
                  cond: (_, evt) => evt.data.keyName === false,
                },
                {
                  target: 'idle',
                  actions: 'dynamicNamespace',
                  cond: (_, evt) => evt.data.namespace === false,
                },
                {
                  target: 'idle',
                  actions: 'dynamicOptions',
                  cond: (_, evt) => evt.data.dynamicOptions,
                },
                {
                  target: 'idle',
                  cond: (_, evt) => !evt.data.keyName,
                },
                {
                  target: 'idle',
                  actions: 'consumeTranslateCall',
                },
              ],
            },
            on: {
              '*': {
                actions: forwardTo('tCall'),
              },
            },
          },
        },
      },
      component: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'punctuation.definition.tag.begin.html': {
                target: 'tag',
                actions: 'storeLine',
              },
            },
          },
          tag: {
            on: {
              '*': 'idle',
              newline: undefined,
              'text.html.derivative': undefined,
              'entity.name.tag.T.html.vue': [
                {
                  target: 'idle',
                  actions: 'consumeIgnoredLine',
                  cond: (ctx) => ctx.ignore?.line === ctx.line,
                },
                {
                  target: 'props',
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
                  target: 'idle',
                  actions: ['consumeParameters', 'pushKey'],
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
        },
      },
    },
    on: {
      SETUP: { actions: 'markAsInSetup' },
      SCRIPT: { actions: 'markAsInScript' },
      TEMPLATE: { actions: 'markAsInTemplate' },
    },
  },
  {
    guards: {
      isPropertiesDataDynamic: (_ctx, evt) =>
        evt.data.keyName === false || evt.data.namespace === false,
    },
    actions: {
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

      storeUseTranslate: assign({
        useTranslate: (_ctx, _evt) => '',
      }),
      storeNamespacedUseTranslate: assign({
        useTranslate: (_ctx, evt) => evt.token,
      }),
      markUseTranslateAsDynamic: assign({
        useTranslate: (_ctx, _evt) => false,
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_NAMESPACE', line: ctx.line },
        ],
      }),

      consumeTranslateCall: assign({
        warnings: (ctx, evt) => {
          if (!evt.data.namespace && ctx.useTranslate === false) {
            return [
              ...ctx.warnings,
              { warning: 'W_UNRESOLVABLE_NAMESPACE', line: ctx.line },
            ];
          }
          if (evt.data.defaultValue === false) {
            return [
              ...ctx.warnings,
              { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: ctx.line },
            ];
          }
          return ctx.warnings;
        },
        keys: (ctx, evt) => {
          const ns =
            evt.data.namespace === null ? ctx.useTranslate : evt.data.namespace;
          if (!evt.data.keyName || ns === false) return ctx.keys;
          return [
            ...ctx.keys,
            {
              keyName: evt.data.keyName,
              namespace: ns || undefined,
              defaultValue: evt.data.defaultValue || undefined,
              line: ctx.line,
            },
          ];
        },
      }),
      consumeParameters: assign({
        key: (ctx, evt) => ({
          keyName: ctx.key.keyName || evt.data.keyName,
          defaultValue:
            ctx.key.defaultValue || evt.data.defaultValue || undefined,
          namespace: evt.data.namespace ?? ctx.key.namespace,
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
        key: VOID_KEY,
      }),

      dynamicKeyName: assign({
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_KEY', line: ctx.line },
        ],
        key: VOID_KEY,
      }),
      dynamicNamespace: assign({
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_NAMESPACE', line: ctx.line },
        ],
        key: VOID_KEY,
      }),
      dynamicOptions: assign({
        key: VOID_KEY,
        warnings: (ctx, _evt) => [
          ...ctx.warnings,
          { warning: 'W_DYNAMIC_OPTIONS', line: ctx.line },
        ],
      }),

      pushKey: assign({
        keys: (ctx, _evt) => {
          if (!ctx.key.keyName || ctx.key.namespace === false) return ctx.keys;
          return [
            ...ctx.keys,
            {
              keyName: ctx.key.keyName.trim(),
              namespace:
                ctx.key.namespace === ''
                  ? undefined
                  : ctx.key.namespace?.trim(),
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

      markAsInSetup: assign({
        currentState: State.SETUP,
      }),
      markAsInScript: assign({
        currentState: State.SCRIPT,
      }),
      markAsInTemplate: assign({
        currentState: State.TEMPLATE,
      }),
    },
  }
);
