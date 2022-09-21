import { setTimeout as wait } from "timers/promises";

const SYMBOLS = ["      🐁", "    🐁  ", "  🐁    ", "🐁      "];

/**
 * Logs an error to the console.
 * @param err The error.
 */
export function error(err: string) {
  console.log(`🔴 ${err}`);
}

/**
 * Shows a loading indicator for a Promise until it resolves.
 *
 * @param comment Comment to display.
 * @param promise The promise to watch.
 * @returns The promise passed in parameter. Useful for decorating without using a buffer variable.
 */
export function loading<T>(comment: string, promise: Promise<T>): Promise<T> {
  let completed = false;
  promise.then(
    () => {
      completed = true;
      process.stdout.write(`\r🐭✅     ${comment}\n`);
    },
    () => {
      completed = true;
      process.stdout.write(`\r🐭🔴     ${comment}\n`);
    }
  );

  setImmediate(async () => {
    let symbolPosition = 0;
    while (!completed) {
      process.stdout.write(`\r${SYMBOLS[symbolPosition]} ${comment}`);
      symbolPosition = (symbolPosition + 1) % 4;
      await wait(250);
    }
  });

  return promise;
}
