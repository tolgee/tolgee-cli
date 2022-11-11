import { createMachine, send, assign } from 'xstate';

type PropertiesContext = {
  property: string | null;
  depth: number;

  keyName: string | null;
  defaultValue: string | null;
  namespace: string | null;
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

          // JSX/TSX
          'entity.other.attribute-name.tsx': {
            actions: 'storePropertyType',
          },
          'keyword.operator.assignment.ts': {
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

          // Value end
          'punctuation.separator.comma.ts': 'idle',
          'punctuation.definition.block.ts': {
            target: 'idle',
            // Replay the event to let depth update itself if necessary
            actions: send((_ctx, evt) => evt),
          },
        },
      },
      value_string: {
        on: {
          '*': {
            target: 'idle',
            actions: 'storePropertyValue',
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
      'punctuation.definition.tag.end.tsx': 'end',
    },
  },
  {
    guards: {
      isOpenCurly: (_ctx, evt) => evt.token === '{' && !evt.scopes.includes('meta.embedded.expression.tsx'),
      isCloseCurly: (_ctx, evt) => evt.token === '}' && !evt.scopes.includes('meta.embedded.expression.tsx'),
      isFinalCloseCurly: (ctx, evt) => evt.token === '}' && ctx.depth === 1,
      isOpenSquare: (_ctx, evt) => evt.token === '[',
      isCloseSquare: (_ctx, evt) => evt.token === ']',
      isRootLevel: (ctx) => ctx.depth === 1,
    },
    actions: {
      storePropertyType: assign({
        property: (_ctx, evt) => evt.token,
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
        property: (_ctx, _evt) => null,
      }),
      incrementDepth: assign({
        depth: (ctx) => ctx.depth + 1,
      }),
      decrementDepth: assign({
        depth: (ctx) => ctx.depth - 1,
      }),
    },
  }
);
