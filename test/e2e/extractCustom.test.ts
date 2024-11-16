import { fileURLToPathSlash } from './utils/toFilePath.js';
import { run } from './utils/run.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);
const FAKE_PROJECT = new URL('./customExtractors/', FIXTURES_PATH);
const TEST_FILE = fileURLToPathSlash(new URL('./testfile.txt', FAKE_PROJECT));
const JS_EXTRACTOR = fileURLToPathSlash(
  new URL('./extract-js.js', FAKE_PROJECT)
);
const TS_EXTRACTOR = fileURLToPathSlash(
  new URL('./extract-ts.ts', FAKE_PROJECT)
);

it('successfully uses a custom extractor written in JS', async () => {
  const out = await run(
    ['extract', 'print', '--extractor', JS_EXTRACTOR, '--patterns', TEST_FILE],
    undefined,
    50e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('STR_CRUDE');
  expect(out.stdout).toContain('STR_WORKING');
  expect(out.stdout).toContain('STR_NEW');
  expect(out.stdout).toContain('STR_PRODUCTION');
}, 60e3);

it('successfully uses a custom extractor written in TS', async () => {
  const out = await run(
    ['extract', 'print', '--extractor', TS_EXTRACTOR, '--patterns', TEST_FILE],
    undefined,
    50e3
  );

  expect(out.code).toBe(0);
  expect(out.stdout).toContain('STR_CRUDE');
  expect(out.stdout).toContain('STR_WORKING');
  expect(out.stdout).toContain('STR_NEW');
  expect(out.stdout).toContain('STR_PRODUCTION');
}, 60e3);
