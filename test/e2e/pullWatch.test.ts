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

  it('pulls strings from Tolgee with watch', { timeout: 300000 }, async () => {
    await util.changeLocalizationData('A key');

    await run(['login', '-l']);

    const { kill, promise } = runWithKill(
      ['pull', '--api-key', pak, '--path', TMP_FOLDER, '--watch', '--verbose'],
      undefined,
      300000,
      {
        onStdout: (data) => {
          console.log(data.toString());
        },
        onStderr: (data) => {
          console.error(data.toString());
        },
        printOnExit: false,
      }
    );

    for (let i = 1; i <= 10; i++) {
      await testFetchAfterUpdate(i);
    }
    kill('SIGTERM');
    await promise;
  });

  async function testFetchAfterUpdate(nr: number) {
    // Tests that it pulls after change...
    const newEnText = `Another key ${nr}`;
    console.log(`Changing localization data to ${newEnText}...`);
    await util.changeLocalizationData(newEnText);
    console.log(`Waiting for filesystem data to be updated...`);
    await util.waitFilesystemDataUpdated(newEnText);
    console.log(`Tested pull after ${nr} change(s)...`);
  }
});
