import { tmpdir } from 'os';
import { join } from 'path';
import { rm } from 'fs/promises';
import { run } from './utils/run.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import { createProjectWithClient, deleteProject } from './utils/api/common.js';
import { removeTmpFolder } from './utils/tmp.js';

const AUTH_FILE_PATH = join(tmpdir(), '.tolgee-e2e', 'authentication.json');

afterEach(async () => {
  await removeTmpFolder();
  try {
    await rm(AUTH_FILE_PATH);
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
});

let client: TolgeeClient;

describe('Testing error message', () => {
  beforeAll(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1);
  });
  afterAll(async () => {
    await deleteProject(client);
  });

  it('error server response body is printed', async () => {
    const out = await run(['login', 'tgpat_meow', '--verbose']);

    expect(out.code).toBe(1);
    expect(out.stdout).toMatch('"code":"invalid_pat"');
  });
});
