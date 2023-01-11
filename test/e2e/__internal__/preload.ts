// ---
// This file is used by `run.ts` to mock certain fields to test-specific values.
// ---

import { tmpdir } from 'os';
import { join } from 'path';

import ansi from 'ansi-colors';
import * as constants from '../../../src/constants';

// @ts-expect-error
constants.CONFIG_PATH = join(tmpdir(), '.tolgee-e2e');
ansi.enabled = false;
