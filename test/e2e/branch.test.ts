import { run } from './utils/run.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';
import {
  DEFAULT_SCOPES,
  createBranch,
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';

let client: TolgeeClient;
let pak: string;

async function fetchBranches() {
  const branches = await client.GET('/v2/projects/{projectId}/branches', {
    params: { path: { projectId: client.getProjectId() } },
  });

  return branches.data?._embedded?.branches ?? [];
}

async function findBranch(name: string) {
  const branches = await fetchBranches();
  return branches.find((branch) => branch.name === name);
}

describe('branch command', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Branch project', PROJECT_1);
    pak = await createPak(client, [...DEFAULT_SCOPES, 'project.edit']);
  });

  afterEach(async () => {
    await deleteProject(client);
  });

  it('lists branches', async () => {
    await createBranch(client, 'feature-branch');

    const branches = await fetchBranches();
    const defaultBranch = branches.find((branch) => branch.isDefault);

    const out = await run(['branch', '--api-key', pak]);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('Branches:');
    expect(defaultBranch).toBeTruthy();
    expect(out.stdout).toContain(`- ${defaultBranch!.name}`);
    expect(out.stdout).toContain('- feature-branch');
  });

  it('creates a branch from positional argument', async () => {
    const out = await run(['branch', '--api-key', pak, 'new-branch']);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('Branch "new-branch" created.');

    const created = await findBranch('new-branch');
    expect(created).toBeTruthy();
  });

  it('creates a branch from a specified origin', async () => {
    await createBranch(client, 'origin-branch');

    const out = await run([
      'branch',
      '--api-key',
      pak,
      '--create',
      'forked-branch',
      '--origin',
      'origin-branch',
    ]);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('Branch "forked-branch" created.');

    const created = await findBranch('forked-branch');
    expect(created).toBeTruthy();
    expect(created!.originBranchName).toBe('origin-branch');
  });

  it('deletes a branch', async () => {
    await createBranch(client, 'delete-branch');

    const out = await run([
      'branch',
      '--api-key',
      pak,
      '--delete',
      'delete-branch',
    ]);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('Branch "delete-branch" deleted.');

    const deleted = await findBranch('delete-branch');
    expect(deleted).toBeUndefined();
  });

  it('errors when origin branch does not exist', async () => {
    const out = await run([
      'branch',
      '--api-key',
      pak,
      '--create',
      'new-branch',
      '--origin',
      'missing-branch',
    ]);

    const output = out.stderr + out.stdout;

    expect(out.code).not.toBe(0);
    expect(output).toContain('Origin branch "missing-branch" was not found.');
    expect(output).toContain(
      'Use --origin <branch> to specify an existing base branch.'
    );
    expect(output).toContain('Branches:');
  });

  it('errors when deleting a missing branch', async () => {
    const out = await run([
      'branch',
      '--api-key',
      pak,
      '--delete',
      'missing-branch',
    ]);

    const output = out.stderr + out.stdout;

    expect(out.code).not.toBe(0);
    expect(output).toContain('Branch "missing-branch" was not found.');
    expect(output).toContain('Specify an existing branch.');
    expect(output).toContain('Branches:');
  });

  it('errors when positional branch is combined with --create', async () => {
    const out = await run([
      'branch',
      '--api-key',
      pak,
      'positional-branch',
      '--create',
      'option-branch',
    ]);

    expect(out.code).not.toBe(0);
    expect(out.stderr + out.stdout).toContain(
      "error: use either the '[branch]' arg to create branch or the option '-c, --create <branch>'"
    );
  });

  it('errors when positional branch is combined with --delete', async () => {
    const out = await run([
      'branch',
      '--api-key',
      pak,
      'positional-branch',
      '--delete',
      'other-branch',
    ]);

    expect(out.code).not.toBe(0);
    expect(out.stderr + out.stdout).toContain(
      "error: '[branch]' arg to create branch cannot be used together with option '-d, --delete <branch>'"
    );
  });
});
