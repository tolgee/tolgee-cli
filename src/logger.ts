export const logError = (error: string) => {
  console.log(`🔴 ${error}`)
}

export const logProcess = async <T>(comment: string, promiseProvider: () => Promise<T>): Promise<T> => {
  process.stdout.write("\n");
  write(comment, 0)
  let iterations = 0;
  let done = false
  const promise = promiseProvider()

  const start = () => setTimeout(() => {
    iterations++;
    if (iterations % 20 === 0) {
      const divided = iterations / 20;
      write(comment, divided % 4)
    }
    if (!done) {
      start()
    }
  }, 10)

  start();

  promise.finally(() => {
    done = true
    process.stdout.write(`\r🐭✅      ${comment}`)
  }).catch((e) => {
  })

  return promise
}

const write = (comment: string, symbolIdx: number) => {
  const symbols = ["      🐁", "    🐁  ", "  🐁    ", "🐁      "];
  process.stdout.write(`\r${symbols[symbolIdx]} ${comment}`)
}
