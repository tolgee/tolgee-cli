import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, rm, writeFile } from 'fs/promises';

import { run, runWithKill } from './utils/run.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import {
  API_URL,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import {
  approveAuthorization,
  denyAuthorization,
  isTokenLive,
} from './utils/api/oauth.js';
import {
  createTmpFolderWithConfig,
  removeTmpFolder,
  setupTemporaryFolder,
  TMP_FOLDER,
} from './utils/tmp.js';
import { PullWatchUtil } from './utils/pullWatchUtil.js';

const AUTH_FILE_PATH = join(tmpdir(), '.tolgee-e2e', 'authentication.json');
const AUTHORIZE_URL = /(http:\/\/\S*\/oauth2\/authorize\S*)/;

let client: TolgeeClient;
let serverBindsProject = false;

async function readSession() {
  const store = JSON.parse(await readFile(AUTH_FILE_PATH, 'utf8'));
  return store.localhost?.user;
}

async function writeSession(session: any) {
  const store = JSON.parse(await readFile(AUTH_FILE_PATH, 'utf8'));
  store.localhost.user = session;
  await writeFile(AUTH_FILE_PATH, JSON.stringify(store), { mode: 0o600 });
}

async function loginThroughBrowser(
  respond: (authorizeUrl: string) => Promise<void>,
  args: string[] = []
) {
  let output = '';
  let answered = false;

  const login = runWithKill(
    ['login', '--no-browser', ...args],
    undefined,
    30e3,
    {
      onStdout: (chunk) => {
        output += chunk.toString('utf8');
        const match = AUTHORIZE_URL.exec(output);
        if (!match || answered) {
          return;
        }
        answered = true;
        void respond(match[1]);
      },
    }
  );

  return login.promise;
}

function loginApproved(args: string[] = []) {
  return loginThroughBrowser(
    (url) => approveAuthorization(url, client.getProjectId()),
    args
  );
}

function loginApprovedForAllProjects() {
  return loginThroughBrowser((url) => approveAuthorization(url));
}

/**
 * The token response names the approved project only from
 * tolgee/tolgee-platform#3944 on. Against an older instance the tests that
 * need it are skipped rather than failed. Decided before the test logs in:
 * vitest runs no afterEach for a test that skipped itself, so a login made
 * before the skip would leak into the next test.
 */
function skipUnlessServerBindsProject(ctx: { skip: () => void }) {
  if (!serverBindsProject) {
    ctx.skip();
  }
}

async function removeAuthFile() {
  await rm(AUTH_FILE_PATH, { force: true });
}

describe('browser login', () => {
  setupTemporaryFolder();

  beforeAll(async () => {
    client = await createProjectWithClient('OAuth Project', PROJECT_1);
    await loginApproved();
    serverBindsProject = (await readSession()).projectId !== undefined;
    await removeAuthFile();
  });

  afterAll(async () => {
    await deleteProject(client);
    await run(['logout']);
  });

  afterEach(async () => {
    await removeTmpFolder();
    await removeAuthFile();
  });

  it('signs the user in and stores a session rather than a key', async () => {
    const out = await loginApproved();

    expect(out.code).toBe(0);
    expect(out.stdout).toMatch('Logged in as admin on localhost');
    expect(out.stderr).toBe('');

    const session = await readSession();
    expect(session.type).toBe('oauth');
    expect(session.accessToken).toMatch(/^tgoat_/);
    expect(session.refreshToken).toMatch(/^tgort_/);
  });

  it('lists the session as a browser login', async () => {
    await loginApproved();

    const out = await run(['login', '--list']);

    expect(out.stdout).toMatch(
      `browser login as admin on ${new URL(API_URL).toString()}`
    );
  });

  it('lists the project the login was approved for', async (ctx) => {
    skipUnlessServerBindsProject(ctx);
    await loginApproved();

    const out = await run(['login', '--list']);

    expect(out.stdout).toMatch(`, for project #${client.getProjectId()}`);
  });

  it('reports the missing credential before the missing project id', async () => {
    const { tempFolder } = await createTmpFolderWithConfig({});

    const out = await run(['pull', '--path', tempFolder]);

    expect(out.code).toBe(1);
    expect(out.stdout).toMatch(/Not authenticated for host/);
    expect(out.stdout).not.toMatch(/No Project ID/);
  });

  it('takes the project from an approval that named one', async (ctx) => {
    skipUnlessServerBindsProject(ctx);
    await loginApproved();

    expect((await readSession()).projectId).toBe(client.getProjectId());
  });

  it('runs a command with no project id of its own', async (ctx) => {
    skipUnlessServerBindsProject(ctx);
    await loginApproved();
    const { tempFolder, configFile } = await createTmpFolderWithConfig({
      pull: { path: './data' },
    });

    const out = await run(['-c', configFile, 'pull']);

    expect(out.code).toBe(0);
    const pulled = JSON.parse(
      await readFile(join(tempFolder, 'data', 'en.json'), 'utf8')
    );
    expect(pulled.controller).toBe('Controller');
  });

  it('refuses a project the approval did not name', async (ctx) => {
    skipUnlessServerBindsProject(ctx);
    await loginApproved();
    const { configFile } = await createTmpFolderWithConfig({
      projectId: client.getProjectId() + 1000,
      pull: { path: './data' },
    });

    const out = await run(['-c', configFile, 'pull']);

    expect(out.code).toBe(1);
    expect(out.stdout).toMatch(/browser login cannot be used/i);
  });

  it('uses the session for a command that needs the API', async () => {
    await loginApproved();
    const { tempFolder, configFile } = await createTmpFolderWithConfig({
      projectId: client.getProjectId(),
      pull: { path: './data' },
    });

    const out = await run(['-c', configFile, 'pull']);

    expect(out.code).toBe(0);
    const pulled = JSON.parse(
      await readFile(join(tempFolder, 'data', 'en.json'), 'utf8')
    );
    expect(pulled.controller).toBe('Controller');
  });

  it('uses the session for a command that writes', async () => {
    await loginApproved();
    const { configFile } = await createTmpFolderWithConfig({
      projectId: client.getProjectId(),
    });

    const out = await run([
      '-c',
      configFile,
      'tag',
      '--filter-tag',
      'nonexistent-tag',
      '--tag',
      'e2e-oauth',
    ]);

    expect(out.code).toBe(0);
    expect(out.stderr).toBe('');
  });

  it('refreshes a token that is about to expire', async () => {
    await loginApproved();
    const before = await readSession();
    await writeSession({ ...before, accessExpires: Date.now() + 5_000 });

    const { configFile } = await createTmpFolderWithConfig({
      projectId: client.getProjectId(),
      pull: { path: './data' },
    });
    const out = await run(['-c', configFile, 'pull']);

    expect(out.code).toBe(0);
    const after = await readSession();
    expect(after.accessToken).not.toBe(before.accessToken);
    expect(after.refreshToken).not.toBe(before.refreshToken);
    expect(await isTokenLive(after.accessToken)).toBe(true);
  });

  // The websocket authenticates separately from REST, so a session that works
  // for `pull` proves nothing about it.
  it(
    'watches over the websocket with the session',
    { timeout: 120000 },
    async () => {
      await loginApproved();
      const util = new PullWatchUtil(client);
      await util.changeLocalizationData('Watched with a session');

      const { kill, promise } = runWithKill(
        [
          'pull',
          '--project-id',
          String(client.getProjectId()),
          '--path',
          TMP_FOLDER,
          '--watch',
        ],
        undefined,
        120000,
        { printOnExit: false }
      );

      await util.changeLocalizationData('Changed while watching');
      await util.waitFilesystemDataUpdated('Changed while watching');

      kill('SIGINT');
      const out = await promise;

      expect(out.code).toBe(0);
      expect(out.stdout).toContain('Stopped watching');
      expect(out.stderr).not.toContain('ERR_INVALID_ARG_TYPE');
    }
  );

  it('ends the grant on the server when logging out', async () => {
    await loginApproved();
    const session = await readSession();
    expect(await isTokenLive(session.accessToken)).toBe(true);

    const out = await run(['logout']);

    expect(out.code).toBe(0);
    expect(await isTokenLive(session.accessToken)).toBe(false);
  });

  it('reports a refused consent instead of waiting it out', async () => {
    const out = await loginThroughBrowser((url) => denyAuthorization(url));

    expect(out.code).toBe(1);
    expect(out.stdout).toMatch(/access_denied|denied/i);
  });

  it('uses a login approved for every project over a key stored for the project', async () => {
    await loginApprovedForAllProjects();
    // A key the server would refuse, so only the session can make this pass.
    const store = JSON.parse(await readFile(AUTH_FILE_PATH, 'utf8'));
    store.localhost.projects = {
      [String(client.getProjectId())]: {
        token: 'tgpak_no_such_key',
        expires: 0,
      },
    };
    await writeFile(AUTH_FILE_PATH, JSON.stringify(store), { mode: 0o600 });

    const { configFile } = await createTmpFolderWithConfig({
      projectId: client.getProjectId(),
      pull: { path: './data' },
    });
    const out = await run(['-c', configFile, 'pull']);

    expect(out.code).toBe(0);
  });

  it('finds the login for the instance named in .tolgeerc', async () => {
    await loginApproved();
    const { configFile } = await createTmpFolderWithConfig({
      apiUrl: API_URL,
      projectId: client.getProjectId(),
      pull: { path: './data' },
    });

    const out = await run(['-c', configFile, 'pull'], undefined, 10e3, {
      apiUrlFromConfig: true,
    });

    expect(out.code).toBe(0);
  });
});
