import { Token } from './types.js';

/**
 * Pre-pass over the merged token stream that builds a flat map of
 * module-top-level constant string bindings.
 *
 * Two declaration shapes are recognised:
 *
 *   const NAME = 'literal'
 *   const NAME = 'literal' as const
 *
 * and (flat) string-valued object literals:
 *
 *   const NS = { KEY1: 'literal1', KEY2: 'literal2' } as const
 *   const NS = { KEY1: 'literal1', KEY2: 'literal2' }
 *
 * Object literals are flattened, so the second example produces entries
 * `NS.KEY1 -> 'literal1'` and `NS.KEY2 -> 'literal2'`. Nested objects
 * are intentionally skipped (the existing dynamic-namespace warning
 * still fires for those).
 *
 * The extractor walks tokens, not the TS AST, so it cannot natively
 * resolve an identifier passed to `useTranslate(NS)` or `<T ns={NS.X}>`
 * back to its declaration. This helper produces the small symbol table
 * the parser substitutes in when it sees a variable reference.
 *
 * Walking the already-merged token stream (rather than running regex on
 * the raw source) means strings, comments, template literals and block
 * delimiters are already correctly classified by TextMate. In particular
 * the `funcDepth` counter ensures we only capture declarations at module
 * top level — a `const X = '...'` nested inside a function body or
 * branch is invisible to the capture, which matches the visibility the
 * consumer of the identifier would have.
 */

type State =
  | 'Idle'
  | 'AfterConst'
  | 'AfterName'
  | 'InTypeAnnotation'
  | 'AfterAssign'
  | 'InObjectBody'
  | 'InObjectAfterKey'
  | 'InObjectAfterColon';

type AnyToken = Token<string | undefined>;

type Context = {
  result: Map<string, string>;
  state: State;
  // Depth of block/control-flow bodies we're currently inside. While
  // > 0, top-level const-detection is suspended; only block.begin/end
  // are tracked so we know when we resurface.
  funcDepth: number;
  // Depth of a square-bracket pattern (array literal or array
  // destructure) we're currently skipping. Tracked separately from
  // funcDepth so list.begin/end never leaks into block depth and vice
  // versa.
  listDepth: number;
  // Depth of the object literal currently being captured (1 = top of
  // the object body). Tracked separately from funcDepth so a nested
  // object literal value abandons capture without leaking depth.
  objectDepth: number;
  captureName: string;
  captureProps: Array<{ key: string; value: string }>;
  currentKey: string;
  // Set when a nested block.begin is seen during object capture; any
  // properties already collected for this capture are discarded.
  abandonedObject: boolean;
};

function createContext(): Context {
  return {
    result: new Map(),
    state: 'Idle',
    funcDepth: 0,
    listDepth: 0,
    objectDepth: 0,
    captureName: '',
    captureProps: [],
    currentKey: '',
    abandonedObject: false,
  };
}

function resetCapture(ctx: Context): void {
  ctx.state = 'Idle';
  ctx.captureProps = [];
  ctx.captureName = '';
  ctx.currentKey = '';
  ctx.abandonedObject = false;
}

function finalizeObjectCapture(ctx: Context): void {
  if (!ctx.abandonedObject) {
    // Mirror JS object-literal semantics: a later property with the same
    // name overwrites earlier ones, so always assign.
    for (const { key, value } of ctx.captureProps) {
      ctx.result.set(`${ctx.captureName}.${key}`, value);
    }
  }
  resetCapture(ctx);
}

/** Track block depth inside a function body / control-flow block. */
function stepInFunctionBody(ctx: Context, token: AnyToken): void {
  if (token.customType === 'block.begin') ctx.funcDepth++;
  else if (token.customType === 'block.end') ctx.funcDepth--;
}

/** Skip an array literal / array destructure pattern at top level. */
function stepInListSkip(ctx: Context, token: AnyToken): void {
  if (token.customType === 'list.begin') ctx.listDepth++;
  else if (token.customType === 'list.end') ctx.listDepth--;
}

/** Walk the body of a `const NS = { ... }` capture. */
function stepInObjectBody(ctx: Context, token: AnyToken): void {
  const c = token.customType;

  if (c === 'block.begin') {
    ctx.objectDepth++;
    ctx.abandonedObject = true;
    return;
  }
  if (c === 'block.end') {
    ctx.objectDepth--;
    if (ctx.objectDepth === 0) {
      finalizeObjectCapture(ctx);
    }
    return;
  }
  if (ctx.abandonedObject) return;

  switch (ctx.state) {
    case 'InObjectBody':
      if (c === 'object.key') {
        ctx.currentKey = token.token;
        ctx.state = 'InObjectAfterKey';
      }
      break;
    case 'InObjectAfterKey':
      if (c === 'acessor.doublecolon') {
        ctx.state = 'InObjectAfterColon';
      } else {
        ctx.state = 'InObjectBody';
      }
      break;
    case 'InObjectAfterColon':
      if (c === 'string') {
        ctx.captureProps.push({ key: ctx.currentKey, value: token.token });
      }
      ctx.state = 'InObjectBody';
      break;
  }
}

/** Module-top-level state machine — the only place captures originate. */
function stepAtTopLevel(ctx: Context, token: AnyToken): void {
  const c = token.customType;

  switch (ctx.state) {
    case 'Idle':
      if (c === 'block.begin') {
        ctx.funcDepth = 1;
      } else if (!c && token.token === 'const') {
        ctx.state = 'AfterConst';
      }
      // `export` and other prefixes simply stay in Idle until the
      // following `const` token is seen.
      break;

    case 'AfterConst':
      if (c === 'variable') {
        ctx.captureName = token.token;
        ctx.state = 'AfterName';
      } else if (c === 'block.begin') {
        // Object destructure pattern like `const { x } = ...` — skip
        // until the matching block.end via funcDepth.
        ctx.funcDepth = 1;
        ctx.state = 'Idle';
      } else if (c === 'list.begin') {
        // Array destructure pattern like `const [x] = ...` — skip
        // until the matching list.end via listDepth. Tracked
        // separately from funcDepth because stepInFunctionBody only
        // consumes block.begin/end and would never see the closing
        // bracket, leaving funcDepth permanently > 0.
        ctx.listDepth = 1;
        ctx.state = 'Idle';
      } else {
        ctx.state = 'Idle';
      }
      break;

    case 'AfterName':
      if (c === 'operator.assignment') {
        ctx.state = 'AfterAssign';
      } else if (c === 'acessor.doublecolon') {
        ctx.state = 'InTypeAnnotation';
      } else {
        ctx.state = 'Idle';
      }
      break;

    case 'InTypeAnnotation':
      if (c === 'operator.assignment') {
        ctx.state = 'AfterAssign';
      } else if (c === 'block.begin') {
        // Type-level block like `const X: { foo: 1 } = ...`. Bail out
        // of this declaration; the rest is content we can't reason
        // about with this state machine.
        ctx.funcDepth = 1;
        ctx.state = 'Idle';
      }
      // Otherwise just skip over the type tokens.
      break;

    case 'AfterAssign':
      if (c === 'string') {
        if (!ctx.result.has(ctx.captureName)) {
          ctx.result.set(ctx.captureName, token.token);
        }
        resetCapture(ctx);
      } else if (c === 'block.begin') {
        ctx.objectDepth = 1;
        ctx.state = 'InObjectBody';
      } else {
        ctx.state = 'Idle';
      }
      break;
  }
}

export function extractConstants(
  tokens: ReadonlyArray<AnyToken>
): Map<string, string> {
  const ctx = createContext();

  for (const token of tokens) {
    if (ctx.funcDepth > 0) {
      stepInFunctionBody(ctx, token);
    } else if (ctx.listDepth > 0) {
      stepInListSkip(ctx, token);
    } else if (ctx.objectDepth > 0) {
      stepInObjectBody(ctx, token);
    } else {
      stepAtTopLevel(ctx, token);
    }
  }

  return ctx.result;
}
