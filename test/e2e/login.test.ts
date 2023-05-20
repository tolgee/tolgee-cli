import { tmpdir } from 'os';
import { join } from 'path';
import { rm, readFile } from 'fs/promises';
import { run } from './utils/run.js';
import { getUserPat, PROJECT_PAK_1 } from './utils/tg.js';

const AUTH_FILE_PATH = join(tmpdir(), '.tolgee-e2e', 'authentication.json');

afterEach(async () => {
  try {
    await rm(AUTH_FILE_PATH);
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
});

it('logs the user in with a PAT', async () => {
  const pat = await getUserPat();
  const out = await run(['login', pat]);

  expect(out.code).toBe(0);
  expect(out.stdout).toMatch('Logged in as admin on localhost');
  expect(out.stderr).toBe('');

  // Ensure token is in the registry
  const authFile = await readFile(AUTH_FILE_PATH, 'utf8');
  expect(authFile).toContain(pat);
});

it('logs the user in with a PAK', async () => {
  const out = await run(['login', PROJECT_PAK_1]);

  expect(out.code).toBe(0);
  expect(out.stdout).toMatch(
    'Logged in as admin on localhost for project test1'
  );
  expect(out.stderr).toBe('');

  // Ensure token is in the registry
  const authFile = await readFile(AUTH_FILE_PATH, 'utf8');
  expect(authFile).toContain(PROJECT_PAK_1);
});

it('rejects invalid API keys', async () => {
  const out = await run(['login', 'tgpat_meow']);

  expect(out.code).toBe(1);
  expect(out.stdout).toMatch('API key you provided is invalid');
  expect(out.stderr).toBe('');
});

it('removes tokens when using logout', async () => {
  const pat = await getUserPat();

  // Store token
  const outLogin = await run(['login', pat]);
  expect(outLogin.code).toBe(0);

  // Remove token
  const outLogout = await run(['logout']);
  expect(outLogout.code).toBe(0);
  expect(outLogout.stdout).toMatch('logged out of localhost');
  expect(outLogout.stderr).toBe('');

  // Ensure token is no longer in the registry
  const authFile = await readFile(AUTH_FILE_PATH, 'utf8');
  expect(authFile).not.toContain(pat);
});
