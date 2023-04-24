// ---
// This file is used by `run.ts` to mock certain fields to test-specific values.
// ---

const { tmpdir } = require('os');
const { join } = require('path');
const ansi = require('ansi-colors');

const constants = require('../../../dist/constants');

// @ts-expect-error
constants.CONFIG_PATH = join(tmpdir(), '.tolgee-e2e');
Object.defineProperty(ansi, 'enabled', {
  get: () => false,
  set: () => undefined,
});
