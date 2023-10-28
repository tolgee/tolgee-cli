import { createMachine, send, assign } from 'xstate';

type PropertiesContext = {
  property: string | null;
  depth: number;
  jsxDepth: number;
  static: boolean;
  nextDynamic: boolean;

  keyName: string | false | null;
  defaultValue: string | false | null;
  namespace: string | false | null;
};

// This state machine is responsible for extracting translation key properties from an object/props
export default createMachine<PropertiesContext>(
  {
    predictableActionArguments: true,
    id: 'properties',
    initial: 'idle',
    context: {
      property: null,
      depth: 0,
      jsxDepth: 0,
      static: false,
      nextDynamic: false,

      keyName: null,
      defaultValue: null,
      namespace: null,
    },
    states: {
      idle: {
        on: {
          // JS/TS
          'meta.brace.square.ts': {
            target: 'complex_key',
            cond: 'isOpenSquare',
          },
          'meta.object-literal.key.ts': {
            actions: 'storePropertyType',
            cond: 'isRootLevel',
          },
          'punctuation.separator.key-value.ts': {
            target: 'value',
            cond: 'isRootLevel',
          },
          'variable.other.readwrite.ts': {
            actions: 'markImmediatePropertyAsDynamic',
            cond: (_ctx, evt) =>
              ['key', 'keyName', 'ns', 'defaultValue'].includes(evt.token),
          },

          // JSX/TSX
          'entity.other.attribute-name.tsx': {
            actions: ['markPropertyAsDynamic', 'storePropertyType'],
          },
          'keyword.operator.assignment.ts': {
            target: 'value',
            actions: 'markAsStatic',
          },

          // Svelte
          'entity.other.attribute-name.svelte': {
            actions: ['markPropertyAsDynamic', 'storePropertyType'],
          },
          'punctuation.separator.key-value.svelte': {
            target: 'value',
          },

          // Vue
          'punctuation.attribute-shorthand.event.html.vue': [
            {
              cond: (_, evt) => evt.token === '@',
              actions: ['markPropertyAsDynamic', 'markNextPropertyAsDynamic'],
            },
          ],
          'entity.other.attribute-name.html.vue': [
            {
              cond: (ctx) => ctx.nextDynamic,
              actions: 'markImmediatePropertyAsDynamic',
            },
            {
              actions: [
                'markPropertyAsDynamic',
                'unmarkAsStatic',
                'storePropertyType',
              ],
            },
          ],
          'punctuation.separator.key-value.html.vue': {
            target: 'value',
          },
          'entity.other.attribute-name.html': [
            {
              actions: ['markPropertyAsDynamic', 'storePropertyType'],
            },
          ],
          'punctuation.separator.key-value.html': {
            target: 'value',
          },
        },
      },
      complex_key: {
        on: {
          // On string
          'punctuation.definition.string.begin.ts': 'complex_key_string',
          'punctuation.definition.string.template.begin.ts':
            'complex_key_string',

          // Key end
          'meta.brace.square.ts': {
            target: 'idle',
            cond: 'isCloseSquare',
          },
        },
      },
      complex_key_string: {
        on: {
          '*': {
            target: 'idle',
            actions: 'storePropertyType',
          },
        },
      },
      value: {
        on: {
          // Extract strings
          'punctuation.definition.string.begin.ts': 'value_string',
          'punctuation.definition.string.template.begin.ts': 'value_string',

          'punctuation.definition.string.begin.svelte': 'value_string',
          'punctuation.definition.string.template.begin.svelte': 'value_string',

          'punctuation.definition.string.begin.html': 'value_string',

          // Variable
          'variable.other.readwrite.ts': {
            target: 'idle',
            actions: [
              'unmarkAsStatic',
              'markPropertyAsDynamic',
              'clearPropertyType',
            ],
          },

          // JSX Expression
          'punctuation.section.embedded.begin.tsx': {
            actions: 'unmarkAsStatic',
          },

          // Svelte
          'string.unquoted.svelte': {
            target: 'idle',
            actions: [
              'storePropertyValue',
              'clearPropertyType',
              'unmarkAsStatic',
            ],
          },

          // Vue
          'string.unquoted.html': {
            target: 'idle',
            actions: [
              'storePropertyValue',
              'clearPropertyType',
              'unmarkAsStatic',
            ],
          },

          // Value end
          'punctuation.separator.comma.ts': {
            target: 'idle',
            actions: [
              'unmarkAsStatic',
              'markPropertyAsDynamic',
              'clearPropertyType',
            ],
          },
          'punctuation.definition.block.ts': {
            target: 'idle',
            // Replay the event to let depth update itself if necessary
            actions: [
              'unmarkAsStatic',
              'markPropertyAsDynamic',
              'clearPropertyType',
              send((_ctx, evt) => evt),
            ],
          },
        },
      },
      value_string: {
        on: {
          'punctuation.definition.string.end.ts': {
            target: 'idle',
            actions: ['storeEmptyPropertyValue', 'clearPropertyType'],
          },
          'punctuation.definition.string.template.end.ts': {
            target: 'idle',
            actions: ['storeEmptyPropertyValue', 'clearPropertyType'],
          },

          'punctuation.definition.string.end.svelte': {
            target: 'idle',
            actions: ['storeEmptyPropertyValue', 'clearPropertyType'],
          },
          'punctuation.definition.string.template.end.svelte': {
            target: 'idle',
            actions: ['storeEmptyPropertyValue', 'clearPropertyType'],
          },

          'punctuation.definition.string.end.html': {
            target: 'idle',
            actions: ['storeEmptyPropertyValue', 'clearPropertyType'],
          },

          '*': [
            {
              target: 'idle',
              actions: [
                'storePropertyValue',
                'clearPropertyType',
                'unmarkAsStatic',
              ],
              cond: (ctx) => ctx.static,
            },
            {
              target: 'string_end',
              actions: 'storePropertyValue',
            },
          ],
        },
      },

      string_end: {
        on: {
          'punctuation.separator.comma.ts': {
            target: 'idle',
            actions: 'clearPropertyType',
          },
          'punctuation.definition.template-expression.begin.ts': {
            target: 'idle',
            actions: ['markPropertyAsDynamic', 'clearPropertyType'],
          },
          'keyword.operator.arithmetic.ts': {
            target: 'idle',
            actions: ['markPropertyAsDynamic', 'clearPropertyType'],
          },

          // JSX
          'punctuation.section.embedded.end.tsx': {
            target: 'idle',
            actions: 'clearPropertyType',
          },

          // Svelte
          'punctuation.section.embedded.begin.svelte': {
            target: 'idle',
            actions: ['markPropertyAsDynamic', 'clearPropertyType'],
          },
          'punctuation.definition.string.end.svelte': {
            target: 'idle',
            actions: 'clearPropertyType',
          },
          'punctuation.section.embedded.end.svelte': {
            target: 'idle',
            actions: 'clearPropertyType',
          },

          // Vue
          'punctuation.definition.string.end.html.vue': {
            target: 'idle',
            actions: 'clearPropertyType',
          },
          'punctuation.definition.string.end.html': {
            target: 'idle',
            actions: 'clearPropertyType',
          },
        },
      },
      end: {
        type: 'final',
        data: (ctx, evt) => ({
          keyName: ctx.keyName,
          defaultValue: ctx.defaultValue,
          namespace: ctx.namespace,
          lastEvent: evt,
        }),
      },
    },
    on: {
      'punctuation.definition.block.ts': [
        {
          actions: 'incrementDepth',
          cond: 'isOpenCurly',
        },
        {
          target: 'end',
          cond: 'isFinalCloseCurly',
        },
        {
          actions: 'decrementDepth',
          cond: 'isCloseCurly',
        },
      ],
      'punctuation.definition.tag.begin.tsx': {
        actions: 'incrementJsxDepth',
        cond: (_ctx, evt) => evt.token === '<',
      },
      'punctuation.definition.tag.end.tsx': [
        {
          target: 'end',
          actions: 'markPropertyAsDynamic',
          cond: (ctx) => ctx.jsxDepth === 0,
        },
        {
          actions: 'decrementJsxDepth',
        },
      ],
      'punctuation.definition.tag.end.svelte': {
        target: 'end',
        actions: 'markPropertyAsDynamic',
      },
      'punctuation.definition.tag.end.html.vue': {
        target: 'end',
        actions: 'markPropertyAsDynamic',
      },
      'punctuation.definition.tag.end.html': {
        target: 'end',
        actions: 'markPropertyAsDynamic',
      },
    },
  },
  {
    guards: {
      isOpenCurly: (_ctx, evt) =>
        evt.token === '{' &&
        !evt.scopes.includes('meta.embedded.expression.tsx') &&
        !evt.scopes.includes('meta.embedded.expression.svelte') &&
        (!evt.scopes.includes('source.ts.embedded.html.vue') ||
          evt.scopes.includes('expression.embedded.vue')),
      isCloseCurly: (_ctx, evt) =>
        evt.token === '}' &&
        !evt.scopes.includes('meta.embedded.expression.tsx') &&
        !evt.scopes.includes('meta.embedded.expression.svelte') &&
        (!evt.scopes.includes('source.ts.embedded.html.vue') ||
          evt.scopes.includes('expression.embedded.vue')),
      isFinalCloseCurly: (ctx, evt) => evt.token === '}' && ctx.depth === 1,
      isOpenSquare: (_ctx, evt) => evt.token === '[',
      isCloseSquare: (_ctx, evt) => evt.token === ']',
      isRootLevel: (ctx) => ctx.depth === 1,
    },
    actions: {
      storePropertyType: assign({
        property: (_ctx, evt) => evt.token,
      }),
      clearPropertyType: assign({
        property: (_ctx, _evt) => null,
      }),

      storePropertyValue: assign({
        keyName: (ctx, evt) =>
          ctx.property === 'key' || ctx.property === 'keyName'
            ? evt.token
            : ctx.keyName,
        defaultValue: (ctx, evt) =>
          ctx.property === 'defaultValue' ? evt.token : ctx.defaultValue,
        namespace: (ctx, evt) =>
          ctx.property === 'ns' ? evt.token : ctx.namespace,
      }),
      storeEmptyPropertyValue: assign({
        keyName: (ctx) =>
          ctx.property === 'key' || ctx.property === 'keyName'
            ? ''
            : ctx.keyName,
        defaultValue: (ctx) =>
          ctx.property === 'defaultValue' ? '' : ctx.defaultValue,
        namespace: (ctx) => (ctx.property === 'ns' ? '' : ctx.namespace),
      }),

      markNextPropertyAsDynamic: assign({
        nextDynamic: true,
      }),
      markPropertyAsDynamic: assign({
        nextDynamic: false,
        keyName: (ctx, _evt) =>
          ctx.property === 'key' || ctx.property === 'keyName'
            ? false
            : ctx.keyName,
        defaultValue: (ctx, _evt) =>
          ctx.property === 'defaultValue' ? false : ctx.defaultValue,
        namespace: (ctx, _evt) =>
          ctx.property === 'ns' ? false : ctx.namespace,
      }),
      markImmediatePropertyAsDynamic: assign({
        nextDynamic: false,
        keyName: (ctx, evt) =>
          evt.token === 'key' || evt.token === 'keyName' ? false : ctx.keyName,
        defaultValue: (ctx, evt) =>
          evt.token === 'defaultValue' ? false : ctx.defaultValue,
        namespace: (ctx, evt) => (evt.token === 'ns' ? false : ctx.namespace),
      }),

      incrementDepth: assign({
        depth: (ctx, _evt) => ctx.depth + 1,
      }),
      decrementDepth: assign({
        depth: (ctx, _evt) => ctx.depth - 1,
      }),

      incrementJsxDepth: assign({
        jsxDepth: (ctx, _evt) => ctx.jsxDepth + 2,
      }),
      decrementJsxDepth: assign({
        jsxDepth: (ctx, _evt) => ctx.jsxDepth - 1,
      }),

      markAsStatic: assign({
        static: true,
      }),
      unmarkAsStatic: assign({
        static: false,
      }),
    },
  }
);
