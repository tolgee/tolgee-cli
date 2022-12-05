import { randomUUID } from 'crypto';
import { join } from 'path';
import { readFile } from 'fs/promises';

import { run } from './utils/run';

const RUN_UUID = randomUUID()

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const CODE_PROJECT = join(FIXTURES_PATH, 'codeProjectReact');
const CODE_PROJECT_ERR = join(FIXTURES_PATH, 'codeProjectReactWithErr');
const EXTRACTED_DATA = join(FIXTURES_PATH, 'codeProjectExtracted', 'en.json');

const CODE_PROJECT_MATCH = `${CODE_PROJECT}/**/*.tsx`;
const CODE_PROJECT_ERR_MATCH = `${CODE_PROJECT_ERR}/**/*.tsx`;

let expectedStrings: Record<string, string> = {};


beforeAll(async () => {
  const data = await readFile(EXTRACTED_DATA, 'utf8');
  expectedStrings = JSON.parse(data);
});

if (process.env.GITHUB_ACTIONS) {
  beforeAll(() => {
    console.log(`::stop-commands::JEST_STOP_${RUN_UUID}`)
  })

  afterAll(() => {
    console.log(`::JEST_STOP_${RUN_UUID}::`)
  })
}

it('prints all the strings and warnings from test project', async () => {
  const out = await run(
    ['extract', 'print', '--extractor', 'react', CODE_PROJECT_ERR_MATCH],
    undefined,
    100e3
  );

  expect(out.code).toBe(0);
  for (const [key, value] of Object.entries(expectedStrings)) {
    expect(out.stdout).toContain(key);
    expect(out.stdout).toContain(value);
  }

  expect(out.stdout).toContain('Total unique keys found: 4');
  expect(out.stdout).toContain('Total warnings: 1');
  expect(out.stdout).not.toContain('::warning file=');
}, 120e3);

it('prints all the checking information from test project (without error)', async () => {
  const out = await run(
    ['extract', 'check', '--extractor', 'react', CODE_PROJECT_MATCH],
    undefined,
    100e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('No issues found');
  expect(out.stdout).not.toContain('::warning file=');
}, 120e3);

it('prints all the checking information from test project (with error)', async () => {
  const out = await run(
    ['extract', 'check', '--extractor', 'react', CODE_PROJECT_ERR_MATCH],
    undefined,
    100e3
  );

  expect(out.code).toBe(1);
  expect(out.stdout).toContain('Dynamic key');
  expect(out.stdout).toContain('1 warning in 1 file');
  expect(out.stdout).not.toContain('::warning file=');
}, 120e3);

it('spits GitHub Workflow Commands when it detects GH Actions env', async () => {
  const out = await run(
    ['extract', 'check', '--extractor', 'react', CODE_PROJECT_ERR_MATCH],
    { CI: 'true', GITHUB_ACTIONS: 'true' },
    100e3
  );

  expect(out.code).toBe(1);
  expect(out.stdout).toContain('::warning file=');
}, 120e3);
