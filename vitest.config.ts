import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    globals: true,
    globalSetup: './test/e2e/__internal__/setup.ts',
    setupFiles: ['./test/setenv.ts'],
    testTimeout: 30e3,
  },
});
