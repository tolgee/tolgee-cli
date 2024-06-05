import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: './src/test/e2e/__internal__/setup.ts',
    setupFiles: ['./src/test/setenv.ts'],
  },
});
