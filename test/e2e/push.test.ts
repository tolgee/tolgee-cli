import { fileURLToPath } from 'url';
import { tolgeeDataToDict } from './utils/data.js';
import { run, runWithStdin } from './utils/run.js';
import {
  DEFAULT_SCOPES,
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { PROJECT_3 } from './utils/api/project3.js';
import { PROJECT_2 } from './utils/api/project2.js';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

const PROJECT_1_DIR = new URL('./updatedProject1/', FIXTURES_PATH);

const PROJECT_2_DIR = new URL('./updatedProject2WithConflicts/', FIXTURES_PATH);
const PROJECT_3_DIR = new URL('./updatedProject3/', FIXTURES_PATH);
const PROJECT_3_DEPRECATED_DIR = new URL(
  './updatedProject3DeprecatedKeys/',
  FIXTURES_PATH
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
    await removeTmpFolder();
  });

  it('pushes updated strings to Tolgee', async () => {
    const out = await run([
      '--api-key',
      pak,
      'push',
      '--verbose',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_1_DIR)),
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
    const out = await run([
      '--api-key',
      pak,
      'push',
      '-l',
      'fr',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_1_DIR)),
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
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_1_DIR)
        ),
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
    const out = await run([
      '--api-key',
      pak,
      'push',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_3_DIR)),
      fileURLToPath(new URL(`./{namespace}/{languageTag}.json`, PROJECT_3_DIR)),
      '--force-mode',
      'OVERRIDE',
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

  it('pushes only selected namespaces and languages (args)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        filesTemplate: [
          fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_3_DIR)),
          fileURLToPath(
            new URL(`./{namespace}/{languageTag}.json`, PROJECT_3_DIR)
          ),
        ],
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
        filesTemplate: [
          fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_3_DIR)),
          fileURLToPath(
            new URL(`./{namespace}/{languageTag}.json`, PROJECT_3_DIR)
          ),
        ],
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
        filesTemplate: [
          fileURLToPath(
            new URL(`./{languageTag}.json`, PROJECT_3_DEPRECATED_DIR)
          ),
          fileURLToPath(
            new URL(
              `./{namespace}/{languageTag}.json`,
              PROJECT_3_DEPRECATED_DIR
            )
          ),
        ],
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

    // Keys in the "food" namespace should not be removed
    expect(Object.keys(stored)).toEqual([
      'table',
      'chair',
      'plate',
      'fork',
      'water',
      'salad',
      'tomato',
      'onions',
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
        filesTemplate: [
          fileURLToPath(
            new URL(`./{languageTag}.json`, PROJECT_3_DEPRECATED_DIR)
          ),
          fileURLToPath(
            new URL(
              `./{namespace}/{languageTag}.json`,
              PROJECT_3_DEPRECATED_DIR
            )
          ),
        ],
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

    // Keys in the "food" namespace should not be removed
    expect(Object.keys(stored)).toEqual([
      'table',
      'chair',
      'plate',
      'fork',
      'water',
      'salad',
      'tomato',
      'onions',
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
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_2_DIR)
        ),
        languages: ['en', 'fr'],
      },
    });
    const out = await run([
      '--config',
      configFile,
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
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_2_DIR)
        ),
        languages: ['en', 'fr'],
      },
    });
    const out = await runWithStdin(
      ['--config', configFile, 'push', '--api-key', pak],
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
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        filesTemplate: fileURLToPath(
          new URL(`./{languageTag}.json`, PROJECT_2_DIR)
        ),
        languages: ['en', 'fr'],
      },
    });
    const out = await run([
      '--config',
      configFile,
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

  it('does push correctly when language is not specified', async () => {
    const files = [
      { path: fileURLToPath(new URL(`./en.json`, PROJECT_2_DIR)) },
      { path: fileURLToPath(new URL(`./fr.json`, PROJECT_2_DIR)) },
    ];
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: { files, forceMode: 'OVERRIDE' },
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

  it('does push only selected languages even if langauges are not specified', async () => {
    const files = [
      { path: fileURLToPath(new URL(`./en.json`, PROJECT_2_DIR)) },
      { path: fileURLToPath(new URL(`./fr.json`, PROJECT_2_DIR)) },
    ];
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: { files, forceMode: 'OVERRIDE' },
    });
    const out = await run(['--config', configFile, 'push', '-l', 'en']);

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
        fr: 'Chat',
      },
      'fox-name': {
        __ns: null,
        en: 'Fox',
      },
    });
  });

  it('does print a nice error when languages mapped incorrectly', async () => {
    const files = [
      { path: fileURLToPath(new URL(`./invalid.json`, PROJECT_2_DIR)) },
    ];
    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      push: { files, forceMode: 'OVERRIDE' },
    });
    const out = await run(['--config', configFile, 'push']);

    expect(out.code).toBe(1);
    expect(out.stdout).to.contain(
      'Not able to map files to existing languages in the platform'
    );
  });
});
