import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { join } from 'path';
import {
  API_URL,
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { ORIGINAL_TAGS, createTestTags, getTagsMap } from './utils/api/tags.js';
import { run } from './utils/run.js';
import { fileURLToPathSlash } from './utils/toFilePath.js';
import { Schema } from '#cli/schema.js';
import { createTmpFolderWithConfig, removeTmpFolder } from './utils/tmp.js';

const TAGS_PROJECT_DIR = fileURLToPathSlash(
  new URL('../__fixtures__/tagsProject/', import.meta.url)
);

const TAGS_PROJECT_CONFIG = fileURLToPathSlash(
  new URL('../__fixtures__/tagsProject/config.json', import.meta.url)
);

const PROJECT_CONFIG_BASE = {
  apiUrl: API_URL,
  patterns: [join(TAGS_PROJECT_DIR, './react.tsx')],
  push: {
    files: [
      {
        path: join(TAGS_PROJECT_DIR, './testfiles/en.json'),
        language: 'en',
      },
    ],
  },
} as const satisfies Schema;

let client: TolgeeClient;
let pak: string;

beforeEach(async () => {
  client = await createProjectWithClient('Project with tags', PROJECT_1);
  pak = await createPak(client);
  await createTestTags(client);
});
afterEach(async () => {
  await deleteProject(client);
  await removeTmpFolder();
});

it('updates production tags from extracted (args)', async () => {
  const { configFile } = await createTmpFolderWithConfig(PROJECT_CONFIG_BASE);
  const out = await run([
    '-c',
    configFile,
    '--api-key',
    pak,
    'tag',
    '--filter-extracted',
    '--tag',
    'production-v13',
    '--untag',
    'production-*',
  ]);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    controller: ['production-v13'],
  });
});

it('updates production tags from extracted (config)', async () => {
  const { configFile } = await createTmpFolderWithConfig({
    ...PROJECT_CONFIG_BASE,
    apiKey: pak,
    tag: {
      filterExtracted: true,
      tag: ['production-v13'],
      untag: ['production-*'],
    },
  });
  const out = await run(['-c', configFile, 'tag']);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    controller: ['production-v13'],
  });
});

it('marks as deprecated (args)', async () => {
  const { configFile } = await createTmpFolderWithConfig(PROJECT_CONFIG_BASE);
  const out = await run([
    '-c',
    configFile,
    '--api-key',
    pak,
    'tag',
    '--filter-not-extracted',
    '--filter-tag',
    'production-*',
    '--tag',
    'deprecated-v13',
    '--untag',
    'production-*',
  ]);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    desk: ['deprecated-v13'],
  });
});

it('marks as deprecated (config)', async () => {
  const { configFile } = await createTmpFolderWithConfig({
    ...PROJECT_CONFIG_BASE,
    apiKey: pak,
    tag: {
      filterNotExtracted: true,
      filterTag: ['production-*'],
      tag: ['deprecated-v13'],
      untag: ['production-*'],
    },
  });
  const out = await run(['-c', configFile, 'tag']);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    desk: ['deprecated-v13'],
  });
});

it('marks newly created keys as drafts (args)', async () => {
  const { configFile } = await createTmpFolderWithConfig(PROJECT_CONFIG_BASE);
  const out = await run([
    '-c',
    configFile,
    '--api-key',
    pak,
    'push',
    '--tag-new-keys',
    'draft-another-branch',
  ]);
  expect(out.code).toBe(0);
  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    new: ['draft-another-branch'],
  });
});

it('marks newly created keys as drafts (config)', async () => {
  const { configFile } = await createTmpFolderWithConfig({
    ...PROJECT_CONFIG_BASE,
    apiKey: pak,
    push: {
      ...PROJECT_CONFIG_BASE.push,
      tagNewKeys: ['draft-another-branch'],
    },
  });
  const out = await run(['-c', configFile, 'push']);
  expect(out.code).toBe(0);
  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    new: ['draft-another-branch'],
  });
});

it('marks other keys (args)', async () => {
  const { configFile } = await createTmpFolderWithConfig(PROJECT_CONFIG_BASE);
  const out = await run([
    '-c',
    configFile,
    '--api-key',
    pak,
    'tag',
    '--filter-tag',
    'production-*',
    'draft-*',
    'deprecated-*',
    '--tag-other',
    'other',
  ]);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    keyboard: ['other'],
    remote: ['other'],
  });
});

it('marks other keys (config)', async () => {
  const { configFile } = await createTmpFolderWithConfig({
    ...PROJECT_CONFIG_BASE,
    apiKey: pak,
    tag: {
      filterTag: ['production-*', 'draft-*', 'deprecated-*'],
      tagOther: ['other'],
    },
  });
  const out = await run(['-c', configFile, 'tag']);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
    keyboard: ['other'],
    remote: ['other'],
  });
});

it('marks no key', async () => {
  const out = await run([
    '-c',
    TAGS_PROJECT_CONFIG,
    '--api-key',
    pak,
    'tag',
    '--filter-tag',
    'non-existant',
    '--tag',
    'nothing',
  ]);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
  });
});

it('marks no key but through other without filter', async () => {
  const out = await run([
    '-c',
    TAGS_PROJECT_CONFIG,
    '--api-key',
    pak,
    'tag',
    '--tag-other',
    'nothing',
  ]);

  expect(out.code).toBe(0);

  expect(await getTagsMap(client)).toEqual({
    ...ORIGINAL_TAGS,
  });
});
