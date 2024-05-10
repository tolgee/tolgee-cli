/* eslint-disable jest/expect-expect */
import { fileURLToPath } from 'url';
import { PROJECT_PAK_1, requestGet, requestPut } from './utils/tg.js';
import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

async function cleanupProjectState() {
  await requestPut(
    '/v2/projects/1/translations',
    {
      key: 'controller',
      translations: {
        en: 'Controller',
        fr: 'Manette',
      },
    },
    PROJECT_PAK_1
  );
}

async function testWithConfig(config: string, result?: string) {
  const configPath = fileURLToPath(
    new URL(`./differentFormatsProject/${config}.json`, FIXTURES_PATH)
  );
  const out = await run([
    '--config',
    configPath,
    '--api-key',
    PROJECT_PAK_1,
    'push',
    '-l',
    'en',
    '-f',
    'OVERRIDE',
  ]);

  expect(out.code).toBe(0);

  const keys = await requestGet('/v2/projects/1/translations', PROJECT_PAK_1);

  const stored = tolgeeDataToDict(keys);
  expect(stored.controller).toEqual({
    __ns: null,
    en: result ?? 'You have {count} items',
    fr: 'Manette',
  });
}

afterEach(cleanupProjectState);

it('works with tolgee icu format', async () => {
  await testWithConfig('tolgee-json');
});

it('works with xliff-icu format', async () => {
  await testWithConfig('xliff');
});

it('works with xliff-php format', async () => {
  await testWithConfig('xliff-php', 'You have {0} items');
});

it('works with xliff-java format', async () => {
  await testWithConfig('xliff-java', 'You have {0} items');
});

it('works with po-c icu format', async () => {
  await testWithConfig('po-c', 'You have {0} items');
});

it('works with apple-strings icu format', async () => {
  await testWithConfig('apple-strings', 'You have {0} items');
});

it('works with apple-xliff icu format', async () => {
  await testWithConfig('apple-xliff', 'You have {0} items');
});

it('works with android-xml icu format', async () => {
  await testWithConfig('android-xml', 'You have {0} items');
});

it('works with flutter-arb icu format', async () => {
  await testWithConfig('flutter-arb');
});
