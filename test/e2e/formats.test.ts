import { fileURLToPath } from 'url';
import { tolgeeDataToDict } from './utils/data.js';
import { run } from './utils/run.js';
import { TMP_FOLDER, setupTemporaryFolder } from './utils/tmp.js';
import './utils/toMatchContentsOf.js';
import { join } from 'path';
import { readFileSync } from 'fs';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

type TestConfigProps = {
  config: string;
  inPlatform?: string;
  fileLocation?: string;
  inFile?: string;
};

let client: TolgeeClient;
let pak: string;

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
  const outPush = await run([
    '--config',
    configPath,
    '--api-key',
    pak,
    'push',
    '-l',
    'en',
    '-f',
    'OVERRIDE',
  ]);

  expect(outPush.code).toBe(0);

  const keys = await client.GET('/v2/projects/{projectId}/translations', {
    params: { path: { projectId: client.getProjectId() } },
  });

  const stored = tolgeeDataToDict(keys.data);
  expect(stored.controller).toEqual({
    __ns: null,
    en: inPlatform,
    fr: 'Manette',
  });

  const outPull = await run([
    '--config',
    configPath,
    '--api-key',
    pak,
    'pull',
    '--path',
    TMP_FOLDER,
  ]);
  expect(outPull.code).toBe(0);
  await expect(TMP_FOLDER).toMatchStructureOf(projectPath);
  expect(readFileSync(join(TMP_FOLDER, fileLocation)).toString()).toContain(
    inFile
  );
}

describe('push and pull with different formats', () => {
  setupTemporaryFolder();
  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
    pak = await createPak(client);
  });
  afterEach(async () => {
    await deleteProject(client);
  });

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
});
