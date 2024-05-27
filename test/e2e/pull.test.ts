import { fileURLToPath } from 'url';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import { run } from './utils/run.js';
import './utils/toMatchContentsOf.js';
import { dirname, join } from 'path';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '../../src/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { PROJECT_3 } from './utils/api/project3.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const PROJECT_1_DATA = fileURLToPath(
  new URL('./tolgeeImportData/test1', FIXTURES_PATH)
);
const PROJECT_3_DATA = fileURLToPath(
  new URL('./tolgeeImportData/test3', FIXTURES_PATH)
);
const PROJECT_3_DATA_ONLY_FOOD = fileURLToPath(
  new URL('./tolgeeImportData/test3-only-food', FIXTURES_PATH)
);

let client: TolgeeClient;
let pak: string;

async function addTag(client: TolgeeClient, search: string, tag: string) {
  const keys = await client.GET('/v2/projects/{projectId}/translations', {
    params: { path: { projectId: client.getProjectId() }, query: { search } },
  });
  for (const keyData of keys.data!._embedded!.keys!) {
    const { keyId } = keyData;
    await client.PUT('/v2/projects/{projectId}/keys/{keyId}/tags', {
      params: { path: { projectId: client.getProjectId(), keyId } },
      body: { name: tag },
    });
  }
}

async function prepareTags(client: TolgeeClient) {
  await addTag(client, 'soda', 'soda_tag');
  await addTag(client, 'soda', 'drinks_tag');
  await addTag(client, 'water', 'drinks_tag');
}

describe('Project 1', () => {
  setupTemporaryFolder();
  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
    pak = await createPak(client);
  });
  afterEach(async () => {
    deleteProject(client);
  });

  it('pulls strings from Tolgee', async () => {
    const out = await run(['pull', '--api-key', pak, TMP_FOLDER]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
  });

  it('does empty existing folder if asked to (arg)', async () => {
    await mkdir(TMP_FOLDER);
    const existingFile = join(TMP_FOLDER, 'test');
    await writeFile(existingFile, 'test');
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '--empty-dir',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
  });
});

describe('Project 3', () => {
  setupTemporaryFolder();
  beforeEach(async () => {
    client = await createProjectWithClient('Project 3', PROJECT_3);
    pak = await createPak(client);
  });
  afterEach(async () => {
    deleteProject(client);
  });

  it('pulls strings with all namespaces from Tolgee', async () => {
    const out = await run(['pull', '--api-key', pak, TMP_FOLDER]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_3_DATA);
  });

  it('pulls strings only from the specified namespaces', async () => {
    const namespaceFolder = 'food';
    const out = await run([
      'pull',
      '--api-key',
      pak,
      TMP_FOLDER,
      '--namespaces',
      namespaceFolder,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_3_DATA_ONLY_FOOD);
  });

  it('keeps existing files in folders', async () => {
    await mkdir(TMP_FOLDER);
    const existingFile = join(TMP_FOLDER, 'food', 'test');
    await mkdir(dirname(existingFile), { recursive: true });
    await writeFile(existingFile, 'test');
    const out = await run(['pull', '--api-key', pak, TMP_FOLDER]);

    expect(out.code).toBe(0);
    expect((await readFile(existingFile)).toString()).toEqual('test');
    await rm(existingFile);

    await expect(TMP_FOLDER).toMatchStructureOf(PROJECT_3_DATA);
  });

  it('filters by languages', async () => {
    await mkdir(TMP_FOLDER);
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '-l',
      'en',
      '--',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchStructure(`
├── drinks/
|  └── en.json
├── en.json
└── food/
   └── en.json`);
  });

  it('filters by namespace', async () => {
    await mkdir(TMP_FOLDER);
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '-n',
      'food',
      '--',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchStructure(`
└── food/
   ├── en.json
   └── fr.json`);
  });

  it('filters by tag', async () => {
    await prepareTags(client);
    await mkdir(TMP_FOLDER);
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '-t',
      'soda_tag',
      '--',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchStructure(`
└── drinks/
   ├── en.json
   └── fr.json`);

    const content = (await import(join(TMP_FOLDER, 'drinks', 'en.json')))
      .default;
    expect(content).toEqual({ soda: 'Soda' });
  });

  it('filters negatively by tag', async () => {
    await prepareTags(client);
    await mkdir(TMP_FOLDER);
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '--exclude-tags',
      'soda_tag',
      '--',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchStructure(`
├── drinks/
|  ├── en.json
|  └── fr.json
├── en.json
├── food/
|  ├── en.json
|  └── fr.json
└── fr.json`);

    const content = (await import(join(TMP_FOLDER, 'drinks', 'en.json')))
      .default;
    expect(content).toEqual({ water: 'Water' });
  });

  it('honors files template structure', async () => {
    await prepareTags(client);
    await mkdir(TMP_FOLDER);
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '--exclude-tags',
      'soda_tag',
      '--file-structure-template',
      '{namespace}/lang-{languageTag}.{extension}',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchStructure(`
├── drinks/
|  ├── lang-en.json
|  └── lang-fr.json
├── food/
|  ├── lang-en.json
|  └── lang-fr.json
├── lang-en.json
└── lang-fr.json`);
    const content = (await import(join(TMP_FOLDER, 'drinks', 'lang-en.json')))
      .default;
    expect(content).toEqual({ water: 'Water' });
  });
});
