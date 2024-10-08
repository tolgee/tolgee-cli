import { fileURLToPath } from 'url';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import { run } from './utils/run.js';
import './utils/toMatchContentsOf.js';
import { dirname, join } from 'path';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { PROJECT_3 } from './utils/api/project3.js';
import { NESTED_KEYS_PROJECT } from './utils/api/nestedKeysProject.js';
import { NESTED_ARRAY_KEYS_PROJECT } from './utils/api/nestedArrayKeysProject.js';
import { FULL_LANGUAGE_NAMES_PROJECT } from './utils/api/fullLanguageNamesProject.js';

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

const NESTED_KEYS_PROJECT_FLAT_CONFIG = fileURLToPath(
  new URL('./nestedKeysProject/tolgee.config.flat.json', FIXTURES_PATH)
);

const NESTED_KEYS_PROJECT_NESTED_CONFIG = fileURLToPath(
  new URL('./nestedKeysProject/tolgee.config.nested.json', FIXTURES_PATH)
);

let client: TolgeeClient;
let pak: string;

function readJsonFile(path: string) {
  return JSON.parse(readFileSync(path).toString());
}

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
    await deleteProject(client);
  });

  it('pulls strings from Tolgee', async () => {
    const out = await run(['pull', '--api-key', pak, '--path', TMP_FOLDER]);

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
      '--path',
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
    await deleteProject(client);
  });

  it('pulls strings with all namespaces from Tolgee', async () => {
    const out = await run(['pull', '--api-key', pak, '--path', TMP_FOLDER]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_3_DATA);
  });

  it('pulls strings only from the specified namespaces', async () => {
    const namespaceFolder = 'food';
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '--path',
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
    const out = await run(['pull', '--api-key', pak, '--path', TMP_FOLDER]);

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
      '--path',
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
      '--path',
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
      '--path',
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
      '--path',
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
      '--path',
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

describe('Nested keys project', () => {
  setupTemporaryFolder();
  beforeEach(async () => {
    client = await createProjectWithClient(
      'Nested keys project',
      NESTED_KEYS_PROJECT
    );
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it('pulls flat structure with config delmiter: null', async () => {
    const out = await run([
      'pull',
      '-c',
      NESTED_KEYS_PROJECT_FLAT_CONFIG,
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readJsonFile(join(TMP_FOLDER, 'en.json'))).toEqual({
      'nested.keyboard': 'Keyboard',
    });
  });

  it('pulls flat structure with delimiter in parameter', async () => {
    const out = await run([
      'pull',
      // simulating empty string e.g. `--delimiter ""`, which somehow can't be passed here
      '--delimiter=',
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readJsonFile(join(TMP_FOLDER, 'en.json'))).toEqual({
      'nested.keyboard': 'Keyboard',
    });
  });

  it('pulls nested structure with delmiter: "."', async () => {
    const out = await run([
      'pull',
      '-c',
      NESTED_KEYS_PROJECT_NESTED_CONFIG,
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readJsonFile(join(TMP_FOLDER, 'en.json'))).toEqual({
      nested: { keyboard: 'Keyboard' },
    });
  });

  it('pulls nested structure with delimiter in parameter', async () => {
    const out = await run([
      'pull',
      '--delimiter',
      '.',
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readJsonFile(join(TMP_FOLDER, 'en.json'))).toEqual({
      nested: { keyboard: 'Keyboard' },
    });
  });

  it('pulls nested structure with arrays', async () => {
    const out = await run([
      'pull',
      '--support-arrays',
      '--delimiter',
      '.',
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readJsonFile(join(TMP_FOLDER, 'en.json'))).toEqual({
      nested: { keyboard: 'Keyboard' },
    });
  });
});

describe('Nested array keys project', () => {
  setupTemporaryFolder();
  beforeEach(async () => {
    client = await createProjectWithClient(
      'Nested array keys project',
      NESTED_ARRAY_KEYS_PROJECT
    );
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it('pulls nested structure with arrays', async () => {
    const out = await run([
      'pull',
      '--support-arrays',
      '--format',
      'JSON_ICU',
      '--delimiter',
      '.',
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readJsonFile(join(TMP_FOLDER, 'en.json'))).toEqual({
      nested: [
        {
          keyboard: 'Keyboard 0',
        },
        {
          keyboard: 'Keyboard 1',
        },
      ],
    });
  });

  it('pulls nested structure with arrays', async () => {
    const out = await run([
      'pull',
      '--support-arrays',
      '--format',
      'YAML_ICU',
      '--delimiter',
      '.',
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readFileSync(join(TMP_FOLDER, 'en.yaml')).toString()).toContain(
      `nested:
- keyboard: "Keyboard 0"
- keyboard: "Keyboard 1"`
    );
  });

  it('pulls nested structure with arrays', async () => {
    const out = await run([
      'pull',
      '--support-arrays',
      '--format',
      'YAML_ICU',
      '--delimiter',
      '.',
      '--api-key',
      pak,
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    expect(readFileSync(join(TMP_FOLDER, 'en.yaml')).toString()).toContain(
      `nested:
- keyboard: "Keyboard 0"
- keyboard: "Keyboard 1"`
    );
  });
});

describe('Full language names project', () => {
  setupTemporaryFolder();
  beforeEach(async () => {
    client = await createProjectWithClient(
      'Full language names project',
      FULL_LANGUAGE_NAMES_PROJECT,
      {
        languages: [
          {
            name: 'English',
            originalName: 'English',
            tag: 'en-GB',
            flagEmoji: '🇬🇧',
          },
          {
            name: 'French',
            originalName: 'French',
            tag: 'fr-FR',
            flagEmoji: '🇫🇷',
          },
        ],
      }
    );
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it('honors files template structure (language tags with regions)', async () => {
    const out = await run([
      'pull',
      '--api-key',
      pak,
      '--exclude-tags',
      'soda_tag',
      '--file-structure-template',
      '{namespace}/{androidLanguageTag}-{languageTag}-{snakeLanguageTag}.{extension}',
      '--path',
      TMP_FOLDER,
    ]);

    expect(out.code).toBe(0);
    await expect(TMP_FOLDER).toMatchStructure(`
├── en-rGB-en-GB-en_GB.json
└── fr-rFR-fr-FR-fr_FR.json
`);
    const content = (await import(join(TMP_FOLDER, 'en-rGB-en-GB-en_GB.json')))
      .default;
    expect(content).toEqual({ water: 'Water' });
  });
});
