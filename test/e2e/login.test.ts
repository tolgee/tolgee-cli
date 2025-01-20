import { tmpdir } from 'os';
import { join } from 'path';
import { rm, readFile, mkdtemp, writeFile } from 'fs/promises';
import { run } from './utils/run.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import {
  createPak,
  createPat,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { Schema } from '#cli/schema.js';

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

let client: TolgeeClient;

describe('Project 1', () => {
  beforeAll(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
  });
  afterAll(async () => {
    await deleteProject(client);
  });

  it('logs the user in with a PAT', async () => {
    const pat = await createPat(client);
    const out = await run(['login', pat]);

    expect(out.code).toBe(0);
    expect(out.stdout).toMatch('Logged in as admin on localhost');
    expect(out.stderr).toBe('');

    // Ensure token is in the registry
    const authFile = await readFile(AUTH_FILE_PATH, 'utf8');
    expect(authFile).toContain(pat);
  });

  it('logs the user in with a PAK', async () => {
    const pak = await createPak(client);
    const out = await run(['login', pak]);

    expect(out.code).toBe(0);
    expect(out.stdout).toMatch(
      'Logged in as admin on localhost for project Project 1'
    );
    expect(out.stderr).toBe('');

    // Ensure token is in the registry
    const authFile = await readFile(AUTH_FILE_PATH, 'utf8');
    expect(authFile).toContain(pak);
  });

  it('rejects invalid API keys', async () => {
    const out = await run(['login', 'tgpat_meow']);

    expect(out.code).toBe(1);
    expect(out.stdout).toMatch('API key you provided is invalid');
    expect(out.stderr).toBe('');
  });

  it('removes tokens when using logout', async () => {
    const pat = await createPat(client);

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

  it('allows to specify api key through config', async () => {
    const pak = await createPak(client);
    const { tempFolder, configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      pull: {
        path: './data',
      },
    });
    const englishFile = join(tempFolder, 'data', 'en.json');

    const out = await run(['-c', configFile, 'pull']);

    expect(out.code).toBe(0);
    expect(out.stderr).toBe('');

    const enFile = JSON.parse((await readFile(englishFile)).toString());
    expect(enFile.controller).toEqual('Controller');
  });

  it('ignores login, when apiKey defined in config', async () => {
    const pak = await createPak(client);
    const pat = await createPat(client);
    const loginOut = await run(['login', pat]);
    expect(loginOut.code).toBe(0);

    const { configFile } = await createTmpFolderWithConfig({
      apiKey: pak,
      pull: {
        path: './data',
      },
    });
    const out = await run(['-c', configFile, 'pull']);
    expect(out.code).toBe(0);
  });

  async function createTmpFolderWithConfig(config: Schema) {
    const tempFolder = await mkdtemp(join(tmpdir(), 'cli-project-'));
    const configFile = join(tempFolder, '.tolgeerc.json');
    await writeFile(configFile, JSON.stringify(config, null, 2));
    return { tempFolder, configFile };
  }
});
