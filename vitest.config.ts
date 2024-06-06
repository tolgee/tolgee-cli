import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    globals: true,
    globalSetup: './src/test/e2e/__internal__/setup.ts',
    setupFiles: ['./src/test/setenv.ts'],
    testTimeout: 30e3,
  },
});
