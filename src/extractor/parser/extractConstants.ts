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
 * the `funcDepth` counter below ensures we only capture declarations at
 * module top level — a `const X = '...'` nested inside a function body
 * or branch is invisible to the capture, which matches the visibility
 * the consumer of the identifier would have.
 */
export function extractConstants(
  tokens: ReadonlyArray<Token<string | undefined>>
): Map<string, string> {
  const result = new Map<string, string>();

  type State =
    | 'Idle'
    | 'AfterConst'
    | 'AfterName'
    | 'InTypeAnnotation'
    | 'AfterAssign'
    | 'InObjectBody'
    | 'InObjectAfterKey'
    | 'InObjectAfterColon';

  let state: State = 'Idle';
  // Depth of block/control-flow bodies we're currently inside. While
  // > 0, top-level const-detection is suspended; only block.begin/end
  // are tracked so we know when we resurface.
  let funcDepth = 0;
  // Depth of the object literal currently being captured (1 = top of
  // the object body). Tracked separately from funcDepth so a nested
  // object literal value abandons capture without leaking depth.
  let objectDepth = 0;
  let captureName = '';
  let captureProps: Array<{ key: string; value: string }> = [];
  let currentKey = '';
  let abandonedObject = false;

  const reset = () => {
    state = 'Idle';
    captureProps = [];
    captureName = '';
    currentKey = '';
    abandonedObject = false;
  };

  for (const token of tokens) {
    const c = token.customType;

    // Inside a function body / control-flow block — nothing here is at
    // module top level so skip until we resurface.
    if (funcDepth > 0) {
      if (c === 'block.begin') funcDepth++;
      else if (c === 'block.end') funcDepth--;
      continue;
    }

    // Object literal capture — has its own depth counter.
    if (objectDepth > 0) {
      if (c === 'block.begin') {
        objectDepth++;
        abandonedObject = true;
        continue;
      }
      if (c === 'block.end') {
        objectDepth--;
        if (objectDepth === 0) {
          if (!abandonedObject) {
            for (const { key, value } of captureProps) {
              const composed = `${captureName}.${key}`;
              if (!result.has(composed)) {
                result.set(composed, value);
              }
            }
          }
          reset();
        }
        continue;
      }
      if (abandonedObject) continue;

      switch (state) {
        case 'InObjectBody':
          if (c === 'object.key') {
            currentKey = token.token;
            state = 'InObjectAfterKey';
          }
          break;
        case 'InObjectAfterKey':
          if (c === 'acessor.doublecolon') {
            state = 'InObjectAfterColon';
          } else {
            state = 'InObjectBody';
          }
          break;
        case 'InObjectAfterColon':
          if (c === 'string') {
            captureProps.push({ key: currentKey, value: token.token });
          }
          state = 'InObjectBody';
          break;
      }
      continue;
    }

    // Top-level state machine.
    switch (state) {
      case 'Idle':
        if (c === 'block.begin') {
          funcDepth = 1;
        } else if (!c && token.token === 'const') {
          state = 'AfterConst';
        }
        // `export` and other prefixes simply stay in Idle until the
        // following `const` token is seen.
        break;

      case 'AfterConst':
        if (c === 'variable') {
          captureName = token.token;
          state = 'AfterName';
        } else if (c === 'block.begin' || c === 'list.begin') {
          // Destructure pattern like `const { x } = ...` — skip until
          // the destructure pattern closes by piggybacking on funcDepth.
          funcDepth = 1;
          state = 'Idle';
        } else {
          state = 'Idle';
        }
        break;

      case 'AfterName':
        if (c === 'operator.assignment') {
          state = 'AfterAssign';
        } else if (c === 'acessor.doublecolon') {
          state = 'InTypeAnnotation';
        } else {
          state = 'Idle';
        }
        break;

      case 'InTypeAnnotation':
        if (c === 'operator.assignment') {
          state = 'AfterAssign';
        } else if (c === 'block.begin') {
          // Type-level block like `const X: { foo: 1 } = ...`. Bail out
          // of this declaration; the rest is content we can't reason
          // about with this state machine.
          funcDepth = 1;
          state = 'Idle';
        }
        // Otherwise just skip over the type tokens.
        break;

      case 'AfterAssign':
        if (c === 'string') {
          if (!result.has(captureName)) {
            result.set(captureName, token.token);
          }
          reset();
        } else if (c === 'block.begin') {
          objectDepth = 1;
          state = 'InObjectBody';
        } else {
          state = 'Idle';
        }
        break;
    }
  }

  return result;
}
