import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import { PROJECT_PAK_1, PROJECT_PAK_3 } from './utils/tg.js';
import { run, runWithStdin } from './utils/run.js';
import './utils/toMatchContentsOf.js';

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

it('does not overwrite existing folder', async () => {
  await mkdir(TMP_FOLDER);
  const out = await run(['pull', '--api-key', PROJECT_PAK_1, TMP_FOLDER]);

  expect(out.code).toBe(1);
  await expect(TMP_FOLDER).not.toMatchContentsOf(PROJECT_1_DATA);
});

it('does overwrite existing folder if asked to (arg)', async () => {
  await mkdir(TMP_FOLDER);
  const out = await run([
    'pull',
    '--api-key',
    PROJECT_PAK_1,
    '--overwrite',
    TMP_FOLDER,
  ]);

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
});

it('does overwrite existing folder if asked to (interactive)', async () => {
  await mkdir(TMP_FOLDER);
  const out = await runWithStdin(
    ['pull', '--api-key', PROJECT_PAK_1, TMP_FOLDER],
    'Y'
  );

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
});

it('does not overwrite existing folder if operation cancelled (interactive)', async () => {
  await mkdir(TMP_FOLDER);
  const out = await runWithStdin(
    ['pull', '--api-key', PROJECT_PAK_1, TMP_FOLDER],
    'N'
  );

  expect(out.code).toBe(1);
  await expect(TMP_FOLDER).not.toMatchContentsOf(PROJECT_1_DATA);
});
