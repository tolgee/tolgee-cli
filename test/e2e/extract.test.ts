import { join } from 'path';
import { readFile } from 'fs/promises';

import { run } from './utils/run';

const FIXTURES_PATH = join(__dirname, '..', '__fixtures__');
const CODE_PROJECT = join(FIXTURES_PATH, 'codeProjectReact');
const CODE_PROJECT_ERR = join(FIXTURES_PATH, 'codeProjectReactWithErr');
const CODE_PROJECT_COMMENT = join(FIXTURES_PATH, 'codeProjectCommentOnly');
const EXTRACTED_DATA = join(FIXTURES_PATH, 'codeProjectExtracted', 'en.json');

const CODE_PROJECT_MATCH = `${CODE_PROJECT}/**/*.tsx`;
const CODE_PROJECT_ERR_MATCH = `${CODE_PROJECT_ERR}/**/*.tsx`;
const CODE_PROJECT_COMMENT_MATCH = `${CODE_PROJECT_COMMENT}/**/*.ts`;

let expectedStrings: Record<string, string> = {};

beforeAll(async () => {
  const data = await readFile(EXTRACTED_DATA, 'utf8');
  expectedStrings = JSON.parse(data);
});

it('prints all the strings and warnings from test project', async () => {
  const out = await run(
    ['extract', 'print', CODE_PROJECT_ERR_MATCH],
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
    ['extract', 'check', CODE_PROJECT_MATCH],
    undefined,
    50e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('No issues found');
  expect(out.stdout).not.toContain('::warning file=');
}, 60e3);

it('prints all the checking information from test project (with error)', async () => {
  const out = await run(
    ['extract', 'check', CODE_PROJECT_ERR_MATCH],
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
    ['extract', 'check', CODE_PROJECT_ERR_MATCH],
    { CI: 'true', GITHUB_ACTIONS: 'true' },
    50e3
  );

  expect(out.code).toBe(1);
  expect(out.stdout).toContain('::warning file=');
}, 60e3);

it('extracts from files with only magic comments', async () => {
  const out = await run(
    ['extract', 'print', CODE_PROJECT_COMMENT_MATCH],
    undefined,
    50e3
  );

  console.log(out);
  expect(out.code).toBe(0);
  expect(out.stdout).toContain('Total unique keys found: 1');
  expect(out.stdout).toContain('uwu');
});
