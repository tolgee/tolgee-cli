import { setupTemporaryFolder, TMP_FOLDER } from './utils/tmp.js';
import { run } from './utils/run.js';
import './utils/toMatchContentsOf.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { existsSync } from 'fs';

let client: TolgeeClient;
let pak: string;

describe('Pull watch', () => {
  setupTemporaryFolder();

  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
    pak = await createPak(client);
  });

  afterEach(async () => {
    await deleteProject(client);
  });

  it('pulls strings from Tolgee with watch', async () => {
    changeLocalizationData('A key');

    const process = run(
      ['pull', '--api-key', pak, '--path', TMP_FOLDER, '--watch', '--verbose'],
      undefined,
      300000
    );

    // Tests that it pulls at the beginning...
    await waitFilesystemDataUpdated('A key');

    // We need to sleep a bit to make sure the Last-Modified header is updated.
    // The Last-Modified has second precision, so we need to wait at least 1 second.
    await sleep(1000);
    // Tests that it pulls after change...
    await changeLocalizationData('Another key');
    await waitFilesystemDataUpdated('Another key');
  });
});

export async function waitFilesystemDataUpdated(aKeyValue: string) {
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    if (await isFilesystemDataUpdated(aKeyValue)) {
      return true;
    }
    await sleep(10);
    attempts++;
  }

  throw new Error('Timeout waiting for filesystem data to be updated');
}

export async function isFilesystemDataUpdated(newValue: string) {
  const fs = await import('fs/promises');
  const path = await import('path');

  if (!existsSync(TMP_FOLDER)) return false;

  try {
    const enJsonPath = path.join(TMP_FOLDER, 'en.json');
    const content = await fs.readFile(enJsonPath, 'utf-8');
    const data = JSON.parse(content);
    return data['controller'] === newValue;
  } catch (e) {
    console.debug(e);
    return false;
  }
}

export async function changeLocalizationData(newEnText: string) {
  await client.PUT('/v2/projects/{projectId}/translations', {
    params: {
      path: {
        projectId: client.getProjectId(),
      },
    },
    body: {
      key: 'controller',
      translations: { en: newEnText },
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
