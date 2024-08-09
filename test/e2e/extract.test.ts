import { fileURLToPathSlash } from './utils/toFilePath.js';
import { readFile } from 'fs/promises';
import { run } from './utils/run.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const CODE_PROJECT = fileURLToPathSlash(
  new URL('./codeProjectReact', FIXTURES_PATH)
);
const CODE_PROJECT_ERR = fileURLToPathSlash(
  new URL('./codeProjectReactWithErr', FIXTURES_PATH)
);
const EXTRACTED_DATA = fileURLToPathSlash(
  new URL('./codeProjectExtracted/en.json', FIXTURES_PATH)
);

const CODE_PROJECT_MATCH = `${CODE_PROJECT}/**/*.tsx`;
const CODE_PROJECT_ERR_MATCH = `${CODE_PROJECT_ERR}/**/*.tsx`;

let expectedStrings: Record<string, string> = {};

beforeAll(async () => {
  const data = await readFile(EXTRACTED_DATA, 'utf8');
  expectedStrings = JSON.parse(data);
});

it('prints all the strings and warnings from test project', async () => {
  const out = await run(
    ['extract', 'print', '--patterns', CODE_PROJECT_ERR_MATCH],
    undefined,
    50e3
  );

  expect(out.code).toBe(0);
  for (const [key, value] of Object.entries(expectedStrings)) {
    expect(out.stdout).toContain(key);
    expect(out.stdout).toContain(value);
  }

  expect(out.stdout).toContain('Total unique keys found: 4');
  expect(out.stdout).toContain('Total warnings: 1');
  expect(out.stdout).not.toContain('::warning file=');
}, 60e3);

it('prints all the checking information from test project (without error)', async () => {
  const out = await run(
    ['extract', 'check', '--patterns', CODE_PROJECT_MATCH],
    undefined,
    50e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('No issues found');
  expect(out.stdout).not.toContain('::warning file=');
}, 60e3);

it('prints all the checking information from test project (with error)', async () => {
  const out = await run(
    ['extract', 'check', '--patterns', CODE_PROJECT_ERR_MATCH],
    undefined,
    50e3
  );

  expect(out.code).toBe(1);
  expect(out.stdout).toContain('Dynamic key');
  expect(out.stdout).toContain('1 warning in 1 file');
  expect(out.stdout).not.toContain('::warning file=');
}, 60e3);

it('spits GitHub Workflow Commands when it detects GH Actions env', async () => {
  const out = await run(
    ['extract', 'check', '--patterns', CODE_PROJECT_ERR_MATCH],
    { CI: 'true', GITHUB_ACTIONS: 'true' },
    50e3
  );

  expect(out.code).toBe(1);
  expect(out.stdout).toContain('::warning file=');
}, 60e3);
