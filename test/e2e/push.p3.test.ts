import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';
import {
  DEFAULT_SCOPES,
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_3 } from './utils/api/project3.js';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';
import { pushFilesConfig } from './utils/pushFilesConfig.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

const PROJECT_3_DIR = new URL('./updatedProject3/', FIXTURES_PATH);
const PROJECT_3_DEPRECATED_DIR = new URL(
  './updatedProject3DeprecatedKeys/',
  FIXTURES_PATH
);

let client: TolgeeClient;
let pak: string;

describe('project 3', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 3', PROJECT_3, {
      icuEnabled: true,
    });
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
    await removeTmpFolder();
  });

  it('pushes to Tolgee with correct namespaces', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        files: pushFilesConfig(PROJECT_3_DIR, ['', 'drinks', 'food']),
        forceMode: 'OVERRIDE',
      },
    });
    const out = await run(['--config', configFile, '--api-key', pak, 'push']);
    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['water', 'glass'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(2);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      glass: {
        __ns: null,
        en: 'Glass',
        fr: 'Verre',
      },
      water: {
        __ns: 'drinks',
        en: 'Dihydrogen monoxide',
        fr: 'Monoxyde de dihydrogène',
      },
    });
  });

  it('pushes only selected namespaces and languages (args)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        files: pushFilesConfig(PROJECT_3_DIR, ['', 'drinks', 'food']),
        forceMode: 'OVERRIDE',
      },
    });
    const out = await run([
      '--config',
      configFile,
      'push',
      '--api-key',
      pak,
      '--force-mode',
      'override',
      '-n',
      'drinks',
    ]);
    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['water', 'glass'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(1);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      water: {
        __ns: 'drinks',
        en: 'Dihydrogen monoxide',
        fr: 'Monoxyde de dihydrogène',
      },
    });
  });

  it('pushes only selected namespaces and languages (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: {
        files: pushFilesConfig(PROJECT_3_DIR, ['', 'drinks', 'food']),
        forceMode: 'OVERRIDE',
        namespaces: ['drinks'],
      },
    });
    const out = await run(['--config', configFile, 'push']);
    expect(out.code).toBe(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['water', 'glass'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(1);

    const stored = tolgeeDataToDict(keys.data);
    expect(stored).toEqual({
      water: {
        __ns: 'drinks',
        en: 'Dihydrogen monoxide',
        fr: 'Monoxyde de dihydrogène',
      },
    });
  });

  it('removes other keys (args)', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        files: pushFilesConfig(PROJECT_3_DEPRECATED_DIR, ['', 'drinks']),
      },
    });
    const out = await run([
      '--config',
      configFile,
      'push',
      '--api-key',
      pakWithDelete,
      '--remove-other-keys',
    ]);

    expect(out.code).toEqual(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);

    expect(Object.keys(stored)).toEqual([
      'table',
      'chair',
      'plate',
      'fork',
      'water',
    ]);
  });

  it('removes other keys (config)', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pakWithDelete,
      push: {
        files: pushFilesConfig(PROJECT_3_DEPRECATED_DIR, ['', 'drinks']),
        removeOtherKeys: true,
      },
    });
    const out = await run(['--config', configFile, 'push']);

    expect(out.code).toEqual(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);

    expect(Object.keys(stored)).toEqual([
      'table',
      'chair',
      'plate',
      'fork',
      'water',
    ]);
  });

  it('removes other keys when filtered by namespace', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        files: pushFilesConfig(PROJECT_3_DEPRECATED_DIR, ['', 'drinks']),
      },
    });
    const out = await run([
      '--config',
      configFile,
      'push',
      '--api-key',
      pakWithDelete,
      '--remove-other-keys',
      '--namespaces',
      'drinks',
    ]);

    expect(out.code).toEqual(0);

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);

    expect(Object.keys(stored)).toEqual(['water']);
  });
});
