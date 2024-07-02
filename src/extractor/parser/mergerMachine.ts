import { Token } from './types.js';

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
  resultToken?: (matched: Token<TokenType>[]) => string;
};

function defaultResultToken<T extends string | undefined>(matched: Token<T>[]) {
  return matched.map((t) => t.token).join('');
}

const MERGE_ALL = Symbol('MERGE_ALL');
const MERGE_WITHOUT_LAST = Symbol('MERGE_WITHOUT_LAST');

export const endOptions = {
  MERGE_ALL,
  MERGE_WITHOUT_LAST,
};

function createNewToken(
  tokens: Token[],
  customType: string,
  merger: (matched: Token[]) => string
) {
  return {
    customType,
    type: 'custom',
    startIndex: tokens[0].startIndex,
    endIndex: tokens[tokens.length - 1].endIndex,
    scopes: [],
    line: tokens[0].line,
    token: merger(tokens),
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
        newState === endOptions.MERGE_WITHOUT_LAST
      ) {
        const lastToken =
          newState === endOptions.MERGE_WITHOUT_LAST ? stack.pop() : undefined;
        const newToken = createNewToken(
          stack,
          machine.customType,
          machine.resultToken ?? defaultResultToken
        );
        state = machine.initial;
        stack = [];
        yield newToken;
        if (lastToken) {
          yield lastToken;
        }
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
