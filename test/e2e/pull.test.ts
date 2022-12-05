import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

import { PROJECT_PAK_1, PROJECT_PAK_3 } from './utils/tg';
import { run, runWithStdin } from './utils/run';
import './utils/toMatchPath';

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const PROJECT_1_DATA = join(FIXTURES_PATH, 'tolgeeImportData', 'test1');
const PROJECT_3_DATA = join(FIXTURES_PATH, 'tolgeeImportData', 'test3');

let TMP_FOLDER: string;

beforeEach(() => {
  TMP_FOLDER = join(tmpdir(), randomUUID());
});

afterEach(async () => {
  try {
    await rm(TMP_FOLDER, { recursive: true });
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
});

it('pulls strings from Tolgee', async () => {
  const out = await run(['pull', '--api-key', PROJECT_PAK_1, TMP_FOLDER]);

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_1_DATA);
});

// todo: enable once ns reached tg:latest
it.skip('pulls strings with namespaces from Tolgee', async () => {
  const out = await run(['pull', '--api-key', PROJECT_PAK_3, TMP_FOLDER]);

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_3_DATA);
});

it.todo('pulls strings only from the specified namespaces');

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
