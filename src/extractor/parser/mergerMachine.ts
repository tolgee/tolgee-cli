import { Token } from './types.js';

export type MergeResult<T extends string | undefined> = {
  before: Token<T>[];
  toMerge: Token<T>[];
  after: Token<T>[];
};

export type MachineType<
  TokenType extends string | undefined,
  State,
  CustomTokenType = string,
> = {
  initial: State;
  step: (
    state: State,
    token: Token<TokenType>,
    end: typeof endOptions
  ) => State | symbol | undefined;
  customType: CustomTokenType;
  resultToken?: (matched: Token<TokenType>[]) => Partial<Token>;
  customMerge?: (tokens: Token<TokenType>[]) => MergeResult<TokenType>;
};

const MERGE_ALL = Symbol('MERGE_ALL');
const MERGE_WITHOUT_LAST = Symbol('MERGE_WITHOUT_LAST');
const REPLACE_FIRST = Symbol('REPLACE_FIRST');
const MERGE_CUSTOM = Symbol('MERGE_CUSTOM');

export const endOptions = {
  MERGE_ALL,
  MERGE_WITHOUT_LAST,
  REPLACE_FIRST,
  MERGE_CUSTOM,
};

function createNewToken(
  tokens: Token[],
  customType: string,
  merger: ((matched: Token[]) => Partial<Token>) | undefined
) {
  const mergerData = merger?.(tokens);
  return {
    customType,
    type: 'custom',
    startIndex: tokens[0].startIndex,
    endIndex: tokens[tokens.length - 1].endIndex,
    scopes: [],
    line: tokens[0].line,
    token: tokens.map((t) => t.token).join(''),
    ...mergerData,
  } satisfies Token;
}

export function createMachine<M extends MachineType<any, any, any>>(
  machine: M
): M extends MachineType<
  infer TokenType,
  any,
  infer CustomToken extends string | undefined
>
  ? (
      tokens: Iterable<Token<TokenType>>
    ) => Iterable<Token<TokenType | CustomToken>>
  : never {
  function* generator(tokens: Iterable<Token>) {
    let state = machine.initial;
    let stack: Token[] = [];

    for (const token of tokens) {
      const newState = machine.step(state, token, endOptions);

      stack.push(token);

      if (newState === undefined) {
        state = machine.initial;
        for (const result of stack) {
          yield result;
        }
        stack = [];
        continue;
      } else if (
        newState === endOptions.MERGE_ALL ||
        newState === endOptions.MERGE_WITHOUT_LAST ||
        newState === endOptions.REPLACE_FIRST ||
        newState === endOptions.MERGE_CUSTOM
      ) {
        let before: Token[] = [];
        let toMerge: Token[];
        let after: Token[];
        if (newState === endOptions.MERGE_ALL) {
          toMerge = stack;
          after = [];
        } else if (newState === endOptions.MERGE_WITHOUT_LAST) {
          after = [stack.pop()!];
          toMerge = stack;
        } else if (newState === endOptions.REPLACE_FIRST) {
          toMerge = [stack.shift()!];
          after = stack;
        } else {
          if (!machine.customMerge) {
            throw new Error('No custom merge cpecified');
          }
          const result = machine.customMerge(stack);
          before = result.before;
          toMerge = result.toMerge;
          after = result.after;
        }
        const newToken = createNewToken(
          toMerge,
          machine.customType,
          machine.resultToken
        );
        for (const result of before) {
          yield result;
        }
        yield newToken;
        for (const result of after) {
          yield result;
        }
        stack = [];
        state = machine.initial;
        continue;
      } else {
        state = newState;
        continue;
      }
    }
  }
  return generator as any;
}

export function pipeMachines<M extends MachineType<any, any, any>>(
  definitions: M[]
): M extends MachineType<
  infer TokenType,
  any,
  infer CustomToken extends string | undefined
>
  ? (
      tokens: Iterable<Token<TokenType>>
    ) => Iterable<Token<TokenType | CustomToken>>
  : never {
  const machines = definitions.map((def) => createMachine(def));

  function generator(tokens: Iterable<any>) {
    let items = tokens;
    for (const machine of machines) {
      items = machine(items);
    }
    return items;
  }
  return generator as any;
}
