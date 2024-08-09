import { tmpdir } from 'os';
import { setDebug } from '#cli/utils/logger.js';

process.env.TOLGEE_CLI_CONFIG_PATH = tmpdir();
if (process.env.RUNNER_DEBUG === '1') {
  setDebug(true);
}
