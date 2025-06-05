import { fileURLToPath } from 'node:url';
import { tolgeeDataToDict } from './utils/data.js';
import { run, runWithStdin } from './utils/run.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_2 } from './utils/api/project2.js';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

const PROJECT_2_DIR = new URL('./updatedProject2WithConflicts/', FIXTURES_PATH);

let client: TolgeeClient;
let pak: string;

describe('project 2', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 2', PROJECT_2);
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
    await removeTmpFolder();
  });

  it('does not push strings to Tolgee if there are conflicts', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_2_DIR)
        ),
      },
    });
    const out = await run([
      '--config',
      configFile,
      'push',
      '--api-key',
      pak,
      '--verbose',
    ]);

    expect(out.code).toBe(1);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['cat-name', 'fox-name'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(1);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      'cat-name': {
        __ns: null,
        en: 'Cat',
        fr: 'Chat',
      },
    });
  });

  it('does preserve the remote strings when using KEEP (args)', async () => {
    const out = await run([
      'push',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_2_DIR)),
      '--languages',
      'en',
      'fr',
      '--api-key',
      pak,
      '--force-mode',
      'KEEP',
    ]);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['cat-name', 'fox-name'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      'cat-name': {
        __ns: null,
        en: 'Cat',
        fr: 'Chat',
      },
      'fox-name': {
        __ns: null,
        en: 'Fox',
        fr: 'Renard',
      },
    });
  });

  it('does preserve the remote strings when using KEEP (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: {
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_2_DIR)
        ),
        forceMode: 'KEEP',
        languages: ['en', 'fr'],
      },
    });
    const out = await run(['--config', configFile, 'push']);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['cat-name', 'fox-name'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      'cat-name': {
        __ns: null,
        en: 'Cat',
        fr: 'Chat',
      },
      'fox-name': {
        __ns: null,
        en: 'Fox',
        fr: 'Renard',
      },
    });
  });

  it('asks for confirmation when there are conflicts', async () => {
    const out = await runWithStdin(
      [
        'push',
        '--api-key',
        pak,
        '--files-template',
        fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_2_DIR)),
        '--languages',
        'en',
        'fr',
      ],
      'OVERRIDE'
    );

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['cat-name', 'fox-name'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      'cat-name': {
        __ns: null,
        en: 'Kitty',
        fr: 'Chaton',
      },
      'fox-name': {
        __ns: null,
        en: 'Fox',
        fr: 'Renard',
      },
    });
  });

  it('does override the remote strings when using OVERRIDE (args)', async () => {
    const out = await run([
      'push',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_2_DIR)),
      '--languages',
      'en',
      'fr',
      '--api-key',
      pak,
      '--force-mode',
      'OVERRIDE',
    ]);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['cat-name', 'fox-name'] },
      },
    });
    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      'cat-name': {
        __ns: null,
        en: 'Kitty',
        fr: 'Chaton',
      },
      'fox-name': {
        __ns: null,
        en: 'Fox',
        fr: 'Renard',
      },
    });
  });

  it('does override the remote strings when using OVERRIDE (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: {
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_2_DIR)
        ),
        forceMode: 'OVERRIDE',
        languages: ['en', 'fr'],
      },
    });
    const out = await run(['--config', configFile, 'push']);

    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['cat-name', 'fox-name'] },
      },
    });
    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      'cat-name': {
        __ns: null,
        en: 'Kitty',
        fr: 'Chaton',
      },
      'fox-name': {
        __ns: null,
        en: 'Fox',
        fr: 'Renard',
      },
    });
  });
});
