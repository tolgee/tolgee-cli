import type { ExtractedKey, Warning } from '../index.js';

import { createMachine, assign, send } from 'xstate';
import commentsService from './shared/comments';

type MachineCtx = {
  keys: ExtractedKey[];
  warnings: Warning[];
};

export default createMachine<MachineCtx>(
  {
    predictableActionArguments: true,
    id: 'commentsExtractor',
    context: {
      keys: [],
      warnings: [],
    },
    invoke: {
      id: 'comments',
      src: () => commentsService,
    },
    on: {
      // Service messages
      MAGIC_COMMENT: [
        {
          actions: 'warnUnusedIgnore',
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
      'comment.block.svelte': {
        actions: send(
          (_ctx, evt) => ({
            type: 'COMMENT',
            data: evt.token,
            line: evt.line,
          }),
          { to: 'comments' }
        ),
      },
    },
  },
  {
    actions: {
      warnUnusedIgnore: assign({
        warnings: (ctx, evt) => [
          ...ctx.warnings,
          { warning: 'W_UNUSED_IGNORE', line: evt.line - 1 },
        ],
      }),
      pushKey: assign({
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
