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
          'meta.brace.square.tsx': {
            target: 'complex_key',
            cond: 'isOpenSquare',
          },
          'meta.object-literal.key.tsx': {
            actions: 'storePropertyType',
            cond: 'isRootLevel',
          },
          'punctuation.separator.key-value.tsx': {
            target: 'value',
            cond: 'isRootLevel',
          },

          // JSX/TSX
          'entity.other.attribute-name.tsx': {
            actions: 'storePropertyType',
          },
          'keyword.operator.assignment.tsx': {
            target: 'value',
          },
        },
      },
      complex_key: {
        on: {
          '*': 'idle',
          'punctuation.definition.string.begin.tsx': 'complex_key_string',
          'punctuation.definition.string.template.begin.tsx':
            'complex_key_string',
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
          '*': 'idle',

          // Ignore expression wrap
          'punctuation.section.embedded.begin.tsx': undefined,

          // Extract strings
          'punctuation.definition.string.begin.tsx': 'value_string',
          'punctuation.definition.string.template.begin.tsx': 'value_string',

          // Replay the event to let depth update itself if necessary
          'punctuation.definition.block.tsx': {
            target: 'idle',
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
        }),
      },
    },
    on: {
      'punctuation.definition.block.tsx': [
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
      isOpenCurly: (_ctx, evt) => evt.token === '{',
      isCloseCurly: (_ctx, evt) => evt.token === '}',
      isFinalCloseCurly: (ctx, evt) => evt.token === '}' && ctx.depth === 1,
      isOpenSquare: (_ctx, evt) => evt.token === '[',
      isRootLevel: (ctx) => ctx.depth === 1,
    },
    actions: {
      storePropertyType: assign({
        property: (_ctx, evt) => evt.token,
      }),
      storePropertyValue: assign({
        keyName: (ctx, evt) =>
          ctx.property === 'keyName' ? evt.token : ctx.keyName,
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
