import { PROJECT_PAK_2, PROJECT_PAK_3 } from './utils/tg.js';
import { run } from './utils/run.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const CODE_PATH = new URL('./testProjectCode/', FIXTURES_PATH);

const CODE_PROJECT_2_COMPLETE = new URL('./Test2Complete.tsx', CODE_PATH)
  .pathname;
const CODE_PROJECT_2_ADDED = new URL('./Test2New.tsx', CODE_PATH).pathname;
const CODE_PROJECT_2_DELETED = new URL('./Test2Incomplete.tsx', CODE_PATH)
  .pathname;
const CODE_PROJECT_2_WARNING = new URL('./Test2Warning.tsx', CODE_PATH)
  .pathname;
const CODE_PROJECT_3 = new URL('./Test3Mixed.tsx', CODE_PATH).pathname;
const CODE_UNORDERED = new URL(
  './codeProjectReactUnordered/App.tsx',
  FIXTURES_PATH
).pathname;

it('says projects are in sync when they do match', async () => {
  const out = await run(
    ['compare', '--api-key', PROJECT_PAK_2, CODE_PROJECT_2_COMPLETE],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('is in sync');
}, 30e3);

it('detects new keys in code projects', async () => {
  const out = await run(
    ['compare', '--api-key', PROJECT_PAK_2, CODE_PROJECT_2_ADDED],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('out of sync');
  expect(out.stdout).toContain('2 new keys found');
  // Matching \n is important to ensure it properly understood it is not a namespaced string
  expect(out.stdout).toContain('+ mouse-name\n');
  expect(out.stdout).toContain('+ mouse-sound\n');
}, 30e3);

it('detects keys that no longer exist', async () => {
  const out = await run(
    ['compare', '--api-key', PROJECT_PAK_2, CODE_PROJECT_2_DELETED],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('out of sync');
  expect(out.stdout).toContain('2 unused keys');
  // Matching \n is important to ensure it properly understood it is not a namespaced string
  expect(out.stdout).toContain('- bird-name\n');
  expect(out.stdout).toContain('- bird-sound\n');
}, 30e3);

it('handles namespaces properly', async () => {
  const out = await run(
    ['compare', '--api-key', PROJECT_PAK_3, CODE_PROJECT_3],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('out of sync');
  expect(out.stdout).toContain('4 new keys found');
  expect(out.stdout).toContain('3 unused keys');
  expect(out.stdout).toContain('+ cookies (namespace: food)');
  expect(out.stdout).toContain('- soda (namespace: drinks)');
  expect(out.stdout).toContain('+ table (namespace: furniture)');
  expect(out.stdout).toContain('- table\n');
}, 30e3);

it('logs emitted warnings to stderr', async () => {
  const out = await run(
    ['compare', '--api-key', PROJECT_PAK_2, CODE_PROJECT_2_WARNING],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);
  expect(out.stderr).toContain('Warnings were emitted');
}, 30e3);

it('prints keys sorted in alphabetical order', async () => {
  const out = await run(
    ['compare', '--api-key', PROJECT_PAK_2, CODE_UNORDERED],
    undefined,
    20e3
  );

  expect(out.code).toBe(0);

  // Test all added keys
  expect(out.stdout).toContain('section-content');
  expect(out.stdout).toContain('section-title');
  expect(out.stdout).toContain('copyright-notice');
  expect(out.stdout).toContain('privacy-policy');
  expect(out.stdout).toContain('terms-of-service');
  expect(out.stdout).toContain('welcome');

  expect(out.stdout.indexOf('section-content')).toBeLessThan(
    out.stdout.indexOf('section-title')
  );
  expect(out.stdout.indexOf('section-title')).toBeLessThan(
    out.stdout.indexOf('copyright-notice')
  );
  expect(out.stdout.indexOf('copyright-notice')).toBeLessThan(
    out.stdout.indexOf('privacy-policy')
  );
  expect(out.stdout.indexOf('privacy-policy')).toBeLessThan(
    out.stdout.indexOf('terms-of-service')
  );
  expect(out.stdout.indexOf('terms-of-service')).toBeLessThan(
    out.stdout.indexOf('welcome')
  );

  // Test all removed keys
  expect(out.stdout).toContain('bird-name');
  expect(out.stdout).toContain('bird-sound');
  expect(out.stdout).toContain('cat-name');
  expect(out.stdout).toContain('cat-sound');
  expect(out.stdout).toContain('dog-name');
  expect(out.stdout).toContain('dog-sound');

  expect(out.stdout.indexOf('bird-name')).toBeLessThan(
    out.stdout.indexOf('bird-sound')
  );
  expect(out.stdout.indexOf('bird-sound')).toBeLessThan(
    out.stdout.indexOf('cat-name')
  );
  expect(out.stdout.indexOf('cat-name')).toBeLessThan(
    out.stdout.indexOf('cat-sound')
  );
  expect(out.stdout.indexOf('cat-sound')).toBeLessThan(
    out.stdout.indexOf('dog-name')
  );
  expect(out.stdout.indexOf('dog-name')).toBeLessThan(
    out.stdout.indexOf('dog-sound')
  );
}, 30e3);
