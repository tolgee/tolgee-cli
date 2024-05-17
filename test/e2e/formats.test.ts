/* eslint-disable jest/expect-expect */
import { fileURLToPath } from 'url';
import { PROJECT_PAK_1, requestGet, requestPut } from './utils/tg.js';
import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import './utils/toMatchContentsOf.js';
import { join } from 'path';
import { readFileSync } from 'fs';

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

type TestConfigProps = {
  config: string;
  inPlatform?: string;
  fileLocation?: string;
  inFile?: string;
};

async function testWithConfig({
  config,
  inPlatform = 'You have {count} items',
  fileLocation = 'en.json',
  inFile = 'You have {count} items',
}: TestConfigProps) {
  const configPath = fileURLToPath(
    new URL(`./differentFormatsProject/${config}.json`, FIXTURES_PATH)
  );
  const projectPath = fileURLToPath(
    new URL(`./differentFormatsProject/${config}/`, FIXTURES_PATH)
  );
  const outPull = await run([
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

  expect(outPull.code).toBe(0);

  const keys = await requestGet('/v2/projects/1/translations', PROJECT_PAK_1);

  const stored = tolgeeDataToDict(keys);
  expect(stored.controller).toEqual({
    __ns: null,
    en: inPlatform,
    fr: 'Manette',
  });

  const outPush = await run([
    '--config',
    configPath,
    '--api-key',
    PROJECT_PAK_1,
    'pull',
    TMP_FOLDER,
  ]);
  expect(outPush.code).toBe(0);
  await expect(TMP_FOLDER).toMatchStructureOf(projectPath);
  expect(readFileSync(join(TMP_FOLDER, fileLocation)).toString()).toContain(
    inFile
  );
}

setupTemporaryFolder();
afterEach(cleanupProjectState);

it('works with tolgee icu format', async () => {
  await testWithConfig({ config: 'tolgee-json' });
});

it('works with xliff-icu format', async () => {
  await testWithConfig({ config: 'xliff-icu', fileLocation: 'en.xliff' });
});

it('works with xliff-php format', async () => {
  await testWithConfig({
    config: 'xliff-php',
    inPlatform: 'You have {0} items',
    fileLocation: 'en.xliff',
    inFile: 'You have %s items',
  });
});

it('works with xliff-java format', async () => {
  await testWithConfig({
    config: 'xliff-java',
    inPlatform: 'You have {0} items',
    fileLocation: 'en.xliff',
    inFile: 'You have %s items',
  });
});

it('works with po-c format', async () => {
  await testWithConfig({
    config: 'po-c',
    inPlatform: 'You have {0} items',
    fileLocation: 'en.po',
    inFile: 'You have %s items',
  });
});

it('works with apple-strings icu format', async () => {
  await testWithConfig({
    config: 'apple-strings',
    inPlatform: 'You have {0} items',
    fileLocation: 'en.lproj/Localizable.strings',
    inFile: 'You have %@ items',
  });
});

it('works with apple-xliff icu format', async () => {
  await testWithConfig({
    config: 'apple-xliff',
    inPlatform: 'You have {0} items',
    fileLocation: 'en.xliff',
    inFile: 'You have %@ items',
  });
});

it('works with android-xml icu format', async () => {
  await testWithConfig({
    config: 'android-xml',
    inPlatform: 'You have {0} items',
    fileLocation: 'values-en/strings.xml',
    inFile: 'You have %s items',
  });
});

it('works with flutter-arb icu format', async () => {
  await testWithConfig({ config: 'flutter-arb', fileLocation: 'app_en.arb' });
});
