import { fileURLToPath } from 'url';
import { fileURLToPathSlash } from './utils/toFilePath.js';
import {
  TMP_FOLDER,
  createTmpFolderWithConfig,
  removeTmpFolder,
  setupTemporaryFolder,
} from './utils/tmp.js';
import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';
import './utils/toMatchContentsOf';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
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
const CODE_PROJECT_3_DIFF = `${CODE_PATH}/Test3SingleDiff.tsx`;
const CODE_PROJECT_3_MIXED = `${CODE_PATH}/Test3Mixed.tsx`;

setupTemporaryFolder();

let client: TolgeeClient;
let pak: string;

describe('Project 2', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 2', PROJECT_2);
    pak = await createPak(client);
  });

  afterEach(async () => {
    await deleteProject(client);
    await removeTmpFolder();
  });

  it('says projects are in sync when they do match', async () => {
    const out = await run(
      [
        'sync',
        '--yes',
        '--api-key',
        pak,
        '--patterns',
        CODE_PROJECT_2_COMPLETE,
      ],
      undefined,
      20e3
    );

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('is in sync');
  }, 30e3);

  it('creates new keys in code projects', async () => {
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

  it('tags new keys', async () => {
    const out = await run(
      [
        'sync',
        '--yes',
        '--api-key',
        pak,
        '--tag-new-keys',
        'new',
        'keys',
        '-pt',
        CODE_PROJECT_2_ADDED,
      ],
      undefined,
      20e3
    );

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('+ 2 strings');

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: {
          filterTag: ['new', 'keys'],
        },
      },
    });

    expect(keys.data?._embedded?.keys).toHaveLength(2);

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

  it('deletes keys that no longer exist (args)', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);

    const out = await run(
      [
        'sync',
        '--yes',
        '--remove-unused',
        '--api-key',
        pakWithDelete,
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

  it('deletes keys that no longer exist (config)', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);

    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pakWithDelete,
      sync: {
        removeUnused: true,
      },
      patterns: [CODE_PROJECT_2_DELETED],
    });

    const out = await run(['-c', configFile, 'sync', '--yes'], undefined, 20e3);

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

  it('does a proper backup (args)', async () => {
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

  it('does a proper backup (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      sync: {
        backup: TMP_FOLDER,
      },
      patterns: [CODE_PROJECT_2_DELETED],
    });
    const out = await run(['-c', configFile, 'sync'], undefined, 20e3);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_2_DATA);
  }, 30e3);

  it('logs warnings to stderr and aborts', async () => {
    const out = await run(
      ['sync', '--yes', '--api-key', pak, '--patterns', CODE_PROJECT_2_WARNING],
      undefined,
      20e3
    );

    expect(out.code).toBe(1);
    expect(out.stderr).toContain('Warnings were emitted');
  }, 30e3);

  it('continues when there are warnings and --continue-on-warning is set (args)', async () => {
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

  it('continues when there are warnings and --continue-on-warning is set (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      sync: {
        continueOnWarning: true,
      },
      patterns: [CODE_PROJECT_2_WARNING],
    });
    const out = await run(['-c', configFile, 'sync'], undefined, 20e3);

    expect(out.code).toBe(0);
    expect(out.stderr).toContain('Warnings were emitted');
  }, 30e3);
});

describe('Project 3', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 3', PROJECT_3);
    pak = await createPak(client);
  });

  afterEach(async () => {
    await deleteProject(client);
  });

  it('handles namespaces properly (args)', async () => {
    const out = await run(
      ['sync', '--yes', '--api-key', pak, '--patterns', CODE_PROJECT_3_DIFF],
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

  it('handles namespaces properly (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      patterns: [CODE_PROJECT_3_DIFF],
    });
    const out = await run(['-c', configFile, 'sync', '--yes'], undefined, 20e3);

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

  it('synchronizes the defined namespaces only (args)', async () => {
    const out = await run(
      [
        'sync',
        '--yes',
        '--api-key',
        pak,
        '--patterns',
        CODE_PROJECT_3_MIXED,
        '--namespaces',
        'food',
      ],
      undefined,
      20e3
    );

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('+ 1 string');
    expect(out.stdout).toContain('1 unused key could be deleted.');

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);

    expect(Object.keys(stored)).toContain('table');
    expect(Object.keys(stored)).not.toContain('welcome');
    expect(Object.keys(stored).length).toEqual(11);
  }, 30e3);

  async function print() {
    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);
    console.log(stored);
  }

  it('synchronizes the defined namespaces only (config)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      patterns: [CODE_PROJECT_3_MIXED],
      sync: {
        namespaces: ['', 'food'],
      },
    });
    const out = await run(['-c', configFile, 'sync', '--yes'], undefined, 20e3);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('+ 2 strings');
    expect(out.stdout).toContain('6 unused keys could be deleted.');

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);

    expect(Object.keys(stored)).toContain('spoon');
    expect(Object.keys(stored)).toContain('salad');
    expect(Object.keys(stored)).toContain('table');
    expect(Object.keys(stored)).not.toContain('welcome');
    expect(Object.keys(stored).length).toEqual(12);
  }, 30e3);

  it('deletes only keys within namespace when using namespace selector (args)', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);

    const out = await run(
      [
        'sync',
        '--yes',
        '--remove-unused',
        '--api-key',
        pakWithDelete,
        '--namespaces=',
        '--namespaces=food',
        '--patterns',
        CODE_PROJECT_3_MIXED,
      ],
      undefined,
      20e3
    );

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('+ 2 strings');
    expect(out.stdout).toContain('- 6 strings');

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
      },
    });

    const stored = tolgeeDataToDict(keys.data);

    expect(Object.keys(stored)).toContain('spoon');
    expect(Object.keys(stored)).toContain('salad');
    expect(Object.keys(stored)).not.toContain('table');
    expect(Object.keys(stored)).not.toContain('welcome');
    expect(Object.keys(stored).length).toEqual(6);
  }, 30e3);

  it('deletes only keys within namespace when using namespace selector (config)', async () => {
    const pakWithDelete = await createPak(client, [
      ...DEFAULT_SCOPES,
      'keys.delete',
    ]);

    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pakWithDelete,
      patterns: [CODE_PROJECT_3_MIXED],
      sync: {
        namespaces: ['food'],
        removeUnused: true,
      },
    });

    const out = await run(['-c', configFile, 'sync', '--yes'], undefined, 20e3);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('- 1 string');
    expect(out.stdout).toContain('+ 1 string');

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['onions'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(0);
  }, 30e3);
});
