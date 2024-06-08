import { GeneralTokenType } from './generalMapper.js';
import { Token } from './types.js';

export type IteratorListener<T extends string = GeneralTokenType> = (
  token: Token<T>,
  type: string | undefined
) => void;

export const createIterator = <T extends string = GeneralTokenType>(
  items: Iterable<Token<T>>
) => {
  const iterator = items[Symbol.iterator]();
  let currentItem: Token<T> | undefined;
  let nextItem = iterator.next() as IteratorResult<Token<T>, Token<T>>;
  const listeners: IteratorListener<T>[] = [];
  let currentContext: string | undefined = undefined;

  const self = {
    getLineNumber() {
      return currentItem?.line ?? 0;
    },
    current() {
      return currentItem;
    },
    peek() {
      return nextItem.done ? undefined : nextItem.value;
    },
    onAccept(listener: IteratorListener<T>) {
      listeners.push(listener);
    },
    setLabel(context: string | undefined) {
      currentContext = context;
    },
    getLabel() {
      return currentContext;
    },
    next() {
      const value = self.peek();
      if (currentItem) {
        listeners.forEach((cb) => cb(currentItem!, currentContext));
      }
      currentItem = nextItem.done ? undefined : nextItem.value;
      nextItem = iterator.next();
      return value;
    },
  };
  return self;
};

export type ParserIterator<T extends string = GeneralTokenType> = ReturnType<
  typeof createIterator<T>
>;
