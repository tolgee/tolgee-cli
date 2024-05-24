import { fileURLToPath } from 'url';
import { fileURLToPathSlash } from './utils/toFilePath.js';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';
import './utils/toMatchContentsOf';
import { TolgeeClient } from '../../src/client/TolgeeClient.js';
import {
  DEFAULT_SCOPES,
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { PROJECT_2 } from './utils/api/project2.js';
import { PROJECT_3 } from './utils/api/project3.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const CODE_PATH = fileURLToPathSlash(
  new URL('./testProjectCode', FIXTURES_PATH)
);

const PROJECT_2_DATA = fileURLToPath(
  new URL('./tolgeeImportData/test2', FIXTURES_PATH)
);
const CODE_PROJECT_2_COMPLETE = `${CODE_PATH}/Test2Complete.tsx`;
const CODE_PROJECT_2_ADDED = `${CODE_PATH}/Test2New.tsx`;
const CODE_PROJECT_2_DELETED = `${CODE_PATH}/Test2Incomplete.tsx`;
const CODE_PROJECT_2_WARNING = `${CODE_PATH}/Test2Warning.tsx`;
const CODE_PROJECT_3 = `${CODE_PATH}/Test3SingleDiff.tsx`;

setupTemporaryFolder();

let client: TolgeeClient;
let pak: string;

afterEach(async () => {
  await deleteProject(client);
});

it('says projects are in sync when they do match', async () => {
  client = await createProjectWithClient('Project 2', PROJECT_2);
  pak = await createPak(client);
  const out = await run(
    ['sync', '--yes', '--api-key', pak, '--patterns', CODE_PROJECT_2_COMPLETE],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('is in sync');
}, 30e3);

it('creates new keys in code projects', async () => {
  client = await createProjectWithClient('Project 2', PROJECT_2);
  pak = await createPak(client);

  const out = await run(
    ['sync', '--yes', '--api-key', pak, '-pt', CODE_PROJECT_2_ADDED],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('+ 2 strings');

  const keys = await client.GET('/v2/projects/{projectId}/translations', {
    params: {
      path: { projectId: client.getProjectId() },
      query: { filterKeyName: ['mouse-name', 'mouse-sound'] },
    },
  });

  expect(keys.data?.page?.totalElements).toBe(2);

  const stored = tolgeeDataToDict(keys!.data);
  expect(stored).toEqual({
    'mouse-name': {
      __ns: null,
      en: 'Mouse',
    },
    'mouse-sound': {
      __ns: null,
      en: 'Squeek',
    },
  });
}, 30e3);

it('deletes keys that no longer exist', async () => {
  client = await createProjectWithClient('Project 2', PROJECT_2);
  pak = await createPak(client, [...DEFAULT_SCOPES, 'keys.delete']);

  const out = await run(
    [
      'sync',
      '--yes',
      '--remove-unused',
      '--api-key',
      pak,
      '--patterns',
      CODE_PROJECT_2_DELETED,
    ],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('- 2 strings');

  const keys = await client.GET('/v2/projects/{projectId}/translations', {
    params: {
      path: { projectId: client.getProjectId() },
      query: { filterKeyName: ['bird-name', 'bird-sound'] },
    },
  });

  expect(keys.data?.page?.totalElements).toBe(0);
}, 30e3);

it('handles namespaces properly', async () => {
  client = await createProjectWithClient('Project 3', PROJECT_3);
  pak = await createPak(client, DEFAULT_SCOPES);

  const out = await run(
    ['sync', '--yes', '--api-key', pak, '--patterns', CODE_PROJECT_3],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('+ 1 string');

  const keys = await client.GET('/v2/projects/{projectId}/translations', {
    params: {
      path: { projectId: client.getProjectId() },
      query: { filterKeyName: ['welcome'] },
    },
  });

  expect(keys.data?.page?.totalElements).toBe(1);

  const stored = tolgeeDataToDict(keys.data);
  expect(stored).toEqual({
    welcome: {
      __ns: 'greeting',
      en: 'Welcome!',
    },
  });
}, 30e3);

it('does a proper backup', async () => {
  client = await createProjectWithClient('Project 2', PROJECT_2);
  pak = await createPak(client, DEFAULT_SCOPES);

  const out = await run(
    [
      'sync',
      '--yes',
      '--api-key',
      pak,
      '--backup',
      TMP_FOLDER,
      '--patterns',
      CODE_PROJECT_2_DELETED,
    ],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_2_DATA);
}, 30e3);

it('logs warnings to stderr and aborts', async () => {
  client = await createProjectWithClient('Project 2', PROJECT_2);
  pak = await createPak(client, DEFAULT_SCOPES);

  const out = await run(
    ['sync', '--yes', '--api-key', pak, '--patterns', CODE_PROJECT_2_WARNING],
    undefined,
    20e3
  );

  expect(out.code).toBe(1);
  expect(out.stderr).toContain('Warnings were emitted');
}, 30e3);

it('continues when there are warnings and --continue-on-warning is set', async () => {
  client = await createProjectWithClient('Project 2', PROJECT_2);
  pak = await createPak(client, DEFAULT_SCOPES);

  const out = await run(
    [
      'sync',
      '--yes',
      '--continue-on-warning',
      '--api-key',
      pak,
      '--patterns',
      CODE_PROJECT_2_WARNING,
    ],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stderr).toContain('Warnings were emitted');
}, 30e3);
