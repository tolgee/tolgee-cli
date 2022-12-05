import { join } from 'path';

import {
  PROJECT_PAK_1,
  PROJECT_PAK_2,
  requestGet,
  requestPut,
  requestDelete,
} from './utils/tg';
import { run } from './utils/run';

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const PROJECT_1_UPDATE = join(FIXTURES_PATH, 'updatedProject1');
const PROJECT_2_UPDATE = join(FIXTURES_PATH, 'updatedProject2WithConflicts');

function tolgeeDataToDict(data: any) {
  return Object.fromEntries(
    data._embedded.keys.map((k: any) => [
      k.keyName,
      Object.fromEntries(
        Object.entries(k.translations).map(([locale, data]: any) => [
          locale,
          data.text,
        ])
      ),
    ])
  );
}

async function cleanupProjectState() {
  // Project 1: delete wired & wireless
  const data1 = await requestGet(
    '/v2/projects/1/translations?search=wire',
    PROJECT_PAK_1
  );
  if (data1._embedded) {
    const keys = data1._embedded.keys.map((k: any) => k.keyId);
    await requestDelete('/v2/projects/1/keys', { ids: keys }, PROJECT_PAK_1);
  }

  // Project 2: delete fox-name & fox-sound; reset cat-name
  const data2 = await requestGet(
    '/v2/projects/2/translations?search=fox-',
    PROJECT_PAK_2
  );
  if (data2._embedded) {
    const keys = data2._embedded.keys.map((k: any) => k.keyId);
    await requestDelete('/v2/projects/2/keys', { ids: keys }, PROJECT_PAK_2);
  }

  await requestPut(
    '/v2/projects/2/translations',
    {
      key: 'cat-name',
      translations: {
        en: 'Cat',
        fr: 'Chat',
      },
    },
    PROJECT_PAK_2
  );
}

afterEach(cleanupProjectState);

it('pushes updated strings to Tolgee', async () => {
  const out = await run(['push', '--api-key', PROJECT_PAK_1, PROJECT_1_UPDATE]);

  expect(out.code).toBe(0);

  const keys = await requestGet(
    '/v2/projects/1/translations?search=wire',
    PROJECT_PAK_1
  );
  expect(keys.page.totalElements).toBe(2);

  const stored = tolgeeDataToDict(keys);
  expect(stored).toEqual({
    wired: {
      en: 'Wired',
      fr: 'Filaire',
    },
    wireless: {
      en: 'Wireless',
      fr: 'Sans-fil',
    },
  });
});

it.todo('pushes updated strings to Tolgee with correct namespaces');

it('does not push strings to Tolgee if there are conflicts', async () => {
  const out = await run(['push', '--api-key', PROJECT_PAK_2, PROJECT_2_UPDATE]);

  expect(out.code).toBe(1);

  const keys = await requestGet(
    '/v2/projects/2/translations?filterKeyName=cat-name&filterKeyName=fox-name',
    PROJECT_PAK_2
  );
  expect(keys.page.totalElements).toBe(1);

  const stored = tolgeeDataToDict(keys);
  expect(stored).toEqual({
    'cat-name': {
      en: 'Cat',
      fr: 'Chat',
    },
  });
});

it('does preserve the remote strings when using KEEP', async () => {
  const out = await run([
    'push',
    '--api-key',
    PROJECT_PAK_2,
    '--force-mode',
    'KEEP',
    PROJECT_2_UPDATE,
  ]);

  expect(out.code).toBe(0);

  const keys = await requestGet(
    '/v2/projects/2/translations?filterKeyName=cat-name&filterKeyName=fox-name',
    PROJECT_PAK_2
  );
  expect(keys.page.totalElements).toBe(2);

  const stored = tolgeeDataToDict(keys);
  expect(stored).toEqual({
    'cat-name': {
      en: 'Cat',
      fr: 'Chat',
    },
    'fox-name': {
      en: 'Fox',
      fr: 'Renard',
    },
  });
});

it('does override the remote strings when using OVERRIDE', async () => {
  const out = await run([
    'push',
    '--api-key',
    PROJECT_PAK_2,
    '--force-mode',
    'OVERRIDE',
    PROJECT_2_UPDATE,
  ]);

  expect(out.code).toBe(0);

  const keys = await requestGet(
    '/v2/projects/2/translations?filterKeyName=cat-name&filterKeyName=fox-name',
    PROJECT_PAK_2
  );
  expect(keys.page.totalElements).toBe(2);

  const stored = tolgeeDataToDict(keys);
  expect(stored).toEqual({
    'cat-name': {
      en: 'Kitty',
      fr: 'Chaton',
    },
    'fox-name': {
      en: 'Fox',
      fr: 'Renard',
    },
  });
});
