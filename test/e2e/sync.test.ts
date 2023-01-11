import { join } from 'path';

import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp';
import {
  PROJECT_PAK_2,
  PROJECT_PAK_3,
  requestGet,
  requestPost,
  requestDelete,
} from './utils/tg';
import { tolgeeDataToDict } from './utils/data';
import { run } from './utils/run';
import './utils/toMatchContentsOf';

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const CODE_PATH = join(FIXTURES_PATH, 'testProjectCode');

const PROJECT_2_DATA = join(FIXTURES_PATH, 'tolgeeImportData', 'test2');
const CODE_PROJECT_2_COMPLETE = `${CODE_PATH}/Test2Complete.tsx`;
const CODE_PROJECT_2_ADDED = `${CODE_PATH}/Test2New.tsx`;
const CODE_PROJECT_2_DELETED = `${CODE_PATH}/Test2Incomplete.tsx`;
const CODE_PROJECT_2_WARNING = `${CODE_PATH}/Test2Warning.tsx`;
const CODE_PROJECT_3 = `${CODE_PATH}/Test3SingleDiff.tsx`;

setupTemporaryFolder();

afterEach(async () => {
  // Project 2: delete mouse-* keys, restore bird-name bird-sound
  const data1 = await requestGet(
    '/v2/projects/2/translations?search=mouse-',
    PROJECT_PAK_2
  );
  if (data1._embedded) {
    const keys = data1._embedded.keys.map((k: any) => k.keyId);
    await requestDelete('/v2/projects/2/keys', { ids: keys }, PROJECT_PAK_2);
  }

  await requestPost(
    '/v2/projects/2/keys',
    {
      name: 'bird-name',
      translations: { en: 'Bird', fr: 'Oiseau' },
    },
    PROJECT_PAK_2
  );

  await requestPost(
    '/v2/projects/2/keys',
    {
      name: 'bird-sound',
      translations: { en: 'Tweet', fr: 'Cui-cui' },
    },
    PROJECT_PAK_2
  );

  // Project 3: delete welcome key
  const data2 = await requestGet(
    '/v2/projects/3/translations?search=welcome',
    PROJECT_PAK_3
  );
  if (data2._embedded) {
    const keys = data2._embedded.keys.map((k: any) => k.keyId);
    await requestDelete('/v2/projects/3/keys', { ids: keys }, PROJECT_PAK_3);
  }
});

it('says projects are in sync when they do match', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--api-key',
    PROJECT_PAK_2,
    '--extractor',
    'react',
    CODE_PROJECT_2_COMPLETE,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('is in sync');
});

it('creates new keys in code projects', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--api-key',
    PROJECT_PAK_2,
    '--extractor',
    'react',
    CODE_PROJECT_2_ADDED,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('+ 2 strings');

  const keys = await requestGet(
    '/v2/projects/2/translations?filterKeyName=mouse-name&filterKeyName=mouse-sound',
    PROJECT_PAK_2
  );

  expect(keys.page.totalElements).toBe(2);

  const stored = tolgeeDataToDict(keys);
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
});

it('deletes keys that no longer exist', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--remove-unused',
    '--api-key',
    PROJECT_PAK_2,
    '--extractor',
    'react',
    CODE_PROJECT_2_DELETED,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('- 2 strings');

  const keys = await requestGet(
    '/v2/projects/2/translations?filterKeyName=bird-name&filterKeyName=bird-sound',
    PROJECT_PAK_2
  );

  expect(keys.page.totalElements).toBe(0);
});

it('handles namespaces properly', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--api-key',
    PROJECT_PAK_3,
    '--extractor',
    'react',
    CODE_PROJECT_3,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('+ 1 string');

  const keys = await requestGet(
    '/v2/projects/3/translations?filterKeyName=welcome',
    PROJECT_PAK_3
  );

  expect(keys.page.totalElements).toBe(1);

  const stored = tolgeeDataToDict(keys);
  expect(stored).toEqual({
    welcome: {
      __ns: 'greeting',
      en: 'Welcome!',
    },
  });
});

it('does a proper backup', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--api-key',
    PROJECT_PAK_2,
    '--extractor',
    'react',
    '--backup',
    TMP_FOLDER,
    CODE_PROJECT_2_DELETED,
  ]);

  expect(out.code).toBe(0);
  await expect(TMP_FOLDER).toMatchContentsOf(PROJECT_2_DATA);
});

it('logs warnings to stderr and aborts', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--api-key',
    PROJECT_PAK_2,
    '--extractor',
    'react',
    CODE_PROJECT_2_WARNING,
  ]);

  expect(out.code).toBe(1);
  expect(out.stderr).toContain('Warnings were emitted');
});

it('continues when there are warnings and --continue-on-warning is set', async () => {
  const out = await run([
    'sync',
    '--yes',
    '--continue-on-warning',
    '--api-key',
    PROJECT_PAK_2,
    '--extractor',
    'react',
    CODE_PROJECT_2_WARNING,
  ]);

  expect(out.code).toBe(0);
  expect(out.stderr).toContain('Warnings were emitted');
});
