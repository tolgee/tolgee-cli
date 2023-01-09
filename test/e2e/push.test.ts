import { join } from 'path';

import {
  PROJECT_PAK_1,
  PROJECT_PAK_2,
  PROJECT_PAK_3,
  requestGet,
  requestPut,
  requestDelete,
} from './utils/tg';
import { run } from './utils/run';

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const PROJECT_1_UPDATE = join(FIXTURES_PATH, 'updatedProject1');
const PROJECT_2_UPDATE = join(FIXTURES_PATH, 'updatedProject2WithConflicts');
const PROJECT_3_UPDATE = join(FIXTURES_PATH, 'updatedProject3');

function tolgeeDataToDict(data: any) {
  return Object.fromEntries(
    data._embedded.keys.map((k: any) => [
      k.keyName,
      {
        __ns: k.keyNamespace,
        ...Object.fromEntries(
          Object.entries(k.translations).map(([locale, data]: any) => [
            locale,
            data.text,
          ])
        ),
      },
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

  // Project 3: delete glass; reset [drinks]/water
  const data3 = await requestGet(
    '/v2/projects/3/translations?search=glass',
    PROJECT_PAK_3
  );
  if (data3._embedded) {
    const keys = data3._embedded.keys.map((k: any) => k.keyId);
    await requestDelete('/v2/projects/3/keys', { ids: keys }, PROJECT_PAK_3);
  }

  await requestPut(
    '/v2/projects/3/translations',
    {
      key: 'water',
      namespace: 'drinks',
      translations: {
        en: 'Water',
        fr: 'Eau',
      },
    },
    PROJECT_PAK_3
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

it('pushes updated strings to Tolgee with correct namespaces', async () => {
  const out = await run([
    'push',
    '--api-key',
    PROJECT_PAK_3,
    '--force-mode',
    'override',
    PROJECT_3_UPDATE,
  ]);
  expect(out.code).toBe(0);

  const keys = await requestGet(
    '/v2/projects/3/translations?filterKeyName=water&filterKeyName=glass',
    PROJECT_PAK_3
  );
  expect(keys.page.totalElements).toBe(2);

  const stored = tolgeeDataToDict(keys);
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
      __ns: null,
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
