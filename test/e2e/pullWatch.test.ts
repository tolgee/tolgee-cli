import { setupTemporaryFolder, TMP_FOLDER } from './utils/tmp.js';
import { run, runWithKill } from './utils/run.js';
import './utils/toMatchContentsOf.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { PullWatchUtil } from './utils/pullWatchUtil.js';
import { sleep } from './utils/sleep.js';

let client: TolgeeClient;
let pak: string;
let util: PullWatchUtil;

describe('Pull watch', () => {
  setupTemporaryFolder();

  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
    pak = await createPak(client);
    util = new PullWatchUtil(client);
  });

  afterEach(async () => {
    await deleteProject(client);
  });

  it('pulls strings from Tolgee with watch', async () => {
    await util.changeLocalizationData('A key');

    const { kill } = runWithKill(
      ['pull', '--api-key', pak, '--path', TMP_FOLDER, '--watch', '--verbose'],
      undefined,
      300000
    );

    // Tests that it pulls at the beginning...
    await util.waitFilesystemDataUpdated('A key');

    // We need to sleep a bit to make sure the Last-Modified header is updated.
    // The Last-Modified has second precision, so we need to wait at least 1 second.
    await sleep(1000);
    // Tests that it pulls after change...
    await util.changeLocalizationData('Another key');
    await util.waitFilesystemDataUpdated('Another key');
    kill('SIGTERM');
  });
});
