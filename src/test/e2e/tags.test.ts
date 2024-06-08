import { TolgeeClient } from '../../client/TolgeeClient.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { ORIGINAL_TAGS, createTestTags, getTagsMap } from './utils/api/tags.js';
import { run } from './utils/run.js';
import { fileURLToPathSlash } from './utils/toFilePath.js';

const TAGS_PROJECT_CONFIG = fileURLToPathSlash(
  new URL('../__fixtures__/tagsProject/config.json', import.meta.url)
);

let client: TolgeeClient;
let pak: string;

beforeEach(async () => {
  client = await createProjectWithClient('Project with tags', PROJECT_1);
  pak = await createPak(client);
  await createTestTags(client);
});
afterEach(async () => {
  await deleteProject(client);
});

it('updates production tags from extracted', async () => {
  const out = await run([
    '-c',
    TAGS_PROJECT_CONFIG,
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

it('marks as deprecated', async () => {
  const out = await run([
    '-c',
    TAGS_PROJECT_CONFIG,
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

it('marks newly created keys as drafts', async () => {
  const out = await run([
    '-c',
    TAGS_PROJECT_CONFIG,
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

it('marks other keys', async () => {
  const out = await run([
    '-c',
    TAGS_PROJECT_CONFIG,
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
