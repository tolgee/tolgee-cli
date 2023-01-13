import { join } from 'path';

import { PROJECT_PAK_2, PROJECT_PAK_3 } from './utils/tg';
import { run } from './utils/run';

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const CODE_PATH = join(FIXTURES_PATH, 'testProjectCode');

const CODE_PROJECT_2_COMPLETE = `${CODE_PATH}/Test2Complete.tsx`;
const CODE_PROJECT_2_ADDED = `${CODE_PATH}/Test2New.tsx`;
const CODE_PROJECT_2_DELETED = `${CODE_PATH}/Test2Incomplete.tsx`;
const CODE_PROJECT_2_WARNING = `${CODE_PATH}/Test2Warning.tsx`;
const CODE_PROJECT_3 = `${CODE_PATH}/Test3Mixed.tsx`;

it('says projects are in sync when they do match', async () => {
  const out = await run([
    'compare',
    '--api-key',
    PROJECT_PAK_2,
    CODE_PROJECT_2_COMPLETE,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('is in sync');
});

it('detects new keys in code projects', async () => {
  const out = await run([
    'compare',
    '--api-key',
    PROJECT_PAK_2,
    CODE_PROJECT_2_ADDED,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('out of sync');
  expect(out.stdout).toContain('2 new strings');
  // Matching \n is important to ensure it properly understood it is not a namespaced string
  expect(out.stdout).toContain('+ mouse-name\n');
  expect(out.stdout).toContain('+ mouse-sound\n');
});

it('detects keys that no longer exist', async () => {
  const out = await run([
    'compare',
    '--api-key',
    PROJECT_PAK_2,
    CODE_PROJECT_2_DELETED,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('out of sync');
  expect(out.stdout).toContain('2 removed strings');
  // Matching \n is important to ensure it properly understood it is not a namespaced string
  expect(out.stdout).toContain('- bird-name\n');
  expect(out.stdout).toContain('- bird-sound\n');
});

it('handles namespaces properly', async () => {
  const out = await run([
    'compare',
    '--api-key',
    PROJECT_PAK_3,
    CODE_PROJECT_3,
  ]);

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('out of sync');
  expect(out.stdout).toContain('4 new strings');
  expect(out.stdout).toContain('3 removed strings');
  expect(out.stdout).toContain('+ cookies (namespace: food)');
  expect(out.stdout).toContain('- soda (namespace: drinks)');
  expect(out.stdout).toContain('+ table (namespace: furniture)');
  expect(out.stdout).toContain('- table\n');
});

it('logs emitted warnings to stderr', async () => {
  const out = await run([
    'compare',
    '--api-key',
    PROJECT_PAK_2,
    CODE_PROJECT_2_WARNING,
  ]);

  expect(out.code).toBe(0);
  expect(out.stderr).toContain('Warnings were emitted');
});
