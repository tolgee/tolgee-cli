import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';
import { pushFilesConfig } from './utils/pushFilesConfig.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

const PROJECT_1_DIR = new URL('./updatedProject1/', FIXTURES_PATH);

let client: TolgeeClient;
let pak: string;

describe('project 1', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
    await removeTmpFolder();
  });

  it('pushes updated strings to Tolgee', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      push: { files: pushFilesConfig(PROJECT_1_DIR) },
    });
    const out = await run([
      '--config',
      configFile,
      '--api-key',
      pak,
      'push',
      '--verbose',
    ]);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { search: 'wire' },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      wired: {
        __ns: null,
        en: 'Wired',
        fr: 'Filaire',
      },
      wireless: {
        __ns: null,
        en: 'Wireless',
        fr: 'Sans-fil',
      },
    });
  });

  it('pushes only selected languages (args)', async () => {
    const config = {
      push: { files: pushFilesConfig(PROJECT_1_DIR) },
    };
    const { configFile } = await createTmpFolderWithConfig(config);
    const out = await run([
      '--config',
      configFile,
      '--api-key',
      pak,
      'push',
      '-l',
      'fr',
    ]);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { search: 'wire' },
      },
    });
    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      wired: {
        __ns: null,
        fr: 'Filaire',
      },
      wireless: {
        __ns: null,
        fr: 'Sans-fil',
      },
    });
  });

  it('pushes only selected languages (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: {
        files: pushFilesConfig(PROJECT_1_DIR),
        languages: ['fr'],
      },
    });
    const out = await run(['--config', configFile, 'push']);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { search: 'wire' },
      },
    });
    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      wired: {
        __ns: null,
        fr: 'Filaire',
      },
      wireless: {
        __ns: null,
        fr: 'Sans-fil',
      },
    });
  });
});
