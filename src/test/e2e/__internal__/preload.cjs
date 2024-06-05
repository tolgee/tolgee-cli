// ---
// This file is used by `run.ts` to mock certain fields to test-specific values.
// ---

const ansi = require('ansi-colors');
Object.defineProperty(ansi, 'enabled', {
  get: () => false,
  set: () => {
    /* noop */
  },
});
