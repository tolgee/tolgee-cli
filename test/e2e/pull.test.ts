import { fileURLToPath } from 'url';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import { PROJECT_PAK_1, PROJECT_PAK_3 } from './utils/tg.js';
import { run } from './utils/run.js';
import './utils/toMatchContentsOf.js';
import { dirname, join } from 'path';

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

setupTemporaryFolder();

it('pulls strings from Tolgee', async () => {
  const out = await run(['pull', '--api-key', PROJECT_PAK_1, TMP_FOLDER]);

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
});

it('pulls strings with all namespaces from Tolgee', async () => {
  const out = await run(['pull', '--api-key', PROJECT_PAK_3, TMP_FOLDER]);

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_3_DATA);
});

it('pulls strings only from the specified namespaces', async () => {
  const namespaceFolder = 'food';
  const out = await run([
    'pull',
    '--api-key',
    PROJECT_PAK_3,
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
  const out = await run(['pull', '--api-key', PROJECT_PAK_3, TMP_FOLDER]);

  expect(out.code).toBe(0);
  expect((await readFile(existingFile)).toString()).toEqual('test');
  await rm(existingFile);

  await expect(TMP_FOLDER).toMatchStructureOf(PROJECT_3_DATA);
});

it('does empty existing folder if asked to (arg)', async () => {
  await mkdir(TMP_FOLDER);
  const existingFile = join(TMP_FOLDER, 'test');
  await writeFile(existingFile, 'test');
  const out = await run([
    'pull',
    '--api-key',
    PROJECT_PAK_1,
    '--empty-dir',
    TMP_FOLDER,
  ]);

  expect(out.code).toBe(0);
  expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
});

it('filters by languages', async () => {
  await mkdir(TMP_FOLDER);
  const out = await run([
    'pull',
    '--api-key',
    PROJECT_PAK_3,
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
    PROJECT_PAK_3,
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
