import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';
import { mkdir, writeFile, rm } from 'fs/promises';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import { ok } from 'assert';

const WORK_DIRECTORY = join(tmpdir(), randomUUID());
const PACKAGE_DEST = join(WORK_DIRECTORY, 'package');
const TARBALL_DEST = join(WORK_DIRECTORY, 'tolgee-cli.tgz');

function execOrError(cmd, opts) {
  try {
    return execSync(cmd, opts);
  } catch (e) {
    console.log('ERROR');
    console.log('exit status %d', e.status);
    console.log('--- stdout');
    console.log(e.stdout.toString());
    console.log('---');
    console.log('--- stderr');
    console.log(e.stderr.toString());
    console.log('---');

    rmSync(WORK_DIRECTORY, { recursive: true });
    process.exit(1);
  }
}

// Create folders
await mkdir(PACKAGE_DEST, { recursive: true });

console.log('PREP: building the package');
execOrError('npm run build');

// Create a tarball, and move it to a known path (drop the version from the pkg name)
console.log('PREP: packaging');
execOrError(`npm pack --pack-destination ${JSON.stringify(WORK_DIRECTORY)}`);
const moveCommand = process.platform === 'win32' ? 'move' : 'mv';
execOrError(`${moveCommand} *.tgz tolgee-cli.tgz`, { cwd: WORK_DIRECTORY });

// Create a test npm project and install CLI from tarball
console.log('PREP: preparing test package');
execOrError('npm init --yes', { cwd: PACKAGE_DEST });
execOrError(`npm i ${JSON.stringify(TARBALL_DEST)}`, { cwd: PACKAGE_DEST });

console.log('PREP: done\n');

/// TESTS
// 1. ensure `tolgee help` works.
console.log('TEST: tolgee help works');
const tolgeeHelp = execOrError('npx --no tolgee help', { cwd: PACKAGE_DEST });
ok(tolgeeHelp.toString().includes('Usage: tolgee [options] [command]'));
console.log('OK: tolgee help works');

// 2. ensure `tolgee extract` works
// this test is to ensure textmate grammars have been imported work
console.log('TEST: tolgee extract print works');
const TEST_EXTRACTOR_FILE = join(PACKAGE_DEST, 'test.js');
await writeFile(
  TEST_EXTRACTOR_FILE,
  `import '@tolgee/react'\nReact.createElement(T, { keyName: 'owo' })`
);
const tolgeeExtract = execOrError('npx --no tolgee extract print test.js', {
  cwd: PACKAGE_DEST,
});
ok(tolgeeExtract.toString().includes('1 key found in test.js:'));
console.log('OK: tolgee extract print works');

// 3. ensure `tolgee-cli/extractor` types are importable
console.log('TEST: tolgee-cli/extractor types are importable');
const TEST_TYPE_FILE = join(PACKAGE_DEST, 'test.ts');
await writeFile(
  TEST_TYPE_FILE,
  `import type { ExtractionResult } from '@tolgee/cli/extractor'`
);
execOrError('npm i typescript', { cwd: PACKAGE_DEST });
const tsc = execOrError('npx --no tsc -- --noEmit --lib es2022 test.ts', {
  cwd: PACKAGE_DEST,
});
ok(!tsc.length);
console.log('OK: tolgee extract print works');

console.log('\nSUCCESS: Package appears functional.');
await rm(WORK_DIRECTORY, { recursive: true });
