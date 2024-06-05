import { fileURLToPath } from 'url';
import { tolgeeDataToDict } from './utils/data.js';
import { run, runWithStdin } from './utils/run.js';
import {
  DEFAULT_SCOPES,
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '../../client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { PROJECT_3 } from './utils/api/project3.js';
import { PROJECT_2 } from './utils/api/project2.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const PROJECT_1_CONFIG = fileURLToPath(
  new URL('./updatedProject1/tolgeerc.mjs', FIXTURES_PATH)
);
const PROJECT_2_CONFIG = fileURLToPath(
  new URL('./updatedProject2WithConflicts/.tolgeerc', FIXTURES_PATH)
);
const PROJECT_3_CONFIG = fileURLToPath(
  new URL('./updatedProject3/.tolgeerc', FIXTURES_PATH)
);
const PROJECT_3_DEPRECATED_CONFIG = fileURLToPath(
  new URL('./updatedProject3DeprecatedKeys/.tolgeerc', FIXTURES_PATH)
);

let client: TolgeeClient;
let pak: string;

describe('project 1', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it('pushes updated strings to Tolgee', async () => {
    const out = await run([
      '--config',
      PROJECT_1_CONFIG,
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

  it('pushes only selected languages', async () => {
    const out = await run([
      '--config',
      PROJECT_1_CONFIG,
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
});

describe('project 3', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 3', PROJECT_3);
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it('pushes to Tolgee with correct namespaces', async () => {
    const out = await run([
      '--config',
      PROJECT_3_CONFIG,
      'push',
      '--api-key',
      pak,
      '--force-mode',
      'override',
    ]);
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

  it('pushes only selected namespaces and languages', async () => {
    const out = await run([
      '--config',
      PROJECT_3_CONFIG,
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

  it('removes other keys', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);
    const out = await run([
      '--config',
      PROJECT_3_DEPRECATED_CONFIG,
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
});

describe('project 2', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 2', PROJECT_2);
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it('does not push strings to Tolgee if there are conflicts', async () => {
    const out = await run([
      '--config',
      PROJECT_2_CONFIG,
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

  it('does preserve the remote strings when using KEEP', async () => {
    const out = await run([
      '--config',
      PROJECT_2_CONFIG,
      'push',
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

  it('asks for confirmation when there are conflicts', async () => {
    const out = await runWithStdin(
      ['--config', PROJECT_2_CONFIG, 'push', '--api-key', pak],
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

  it('does override the remote strings when using OVERRIDE', async () => {
    const out = await run([
      '--config',
      PROJECT_2_CONFIG,
      'push',
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
});
