import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { run } from './utils/run.js';
import {
  DEFAULT_SCOPES,
  createBranch,
  createKey,
  createPak,
  createProjectWithClient,
  deleteProject,
  enableFeature,
} from './utils/api/common.js';
import { PROJECT_1 } from './utils/api/project1.js';

let client: TolgeeClient;
let pak: string;

describe('merge command', () => {
  beforeEach(async () => {
    await enableFeature('BRANCHING');
    client = await createProjectWithClient('Project 1', PROJECT_1, {
      useBranching: true,
    });
    pak = await createPak(client, [...DEFAULT_SCOPES, 'project.edit']);
  });

  afterEach(async () => {
    await deleteProject(client);
  });

  it('merges branch without conflicts (args)', async () => {
    await createBranch(client, 'feature-branch');
    await createKey(client, 'branch-key', {
      branch: 'feature-branch',
      translations: { en: 'Branch only' },
    });

    const out = await run(['merge', 'feature-branch', '--api-key', pak]);

    expect(out.code).toBe(0);
    expect(out.stdout).toContain('+ branch-key');
    expect(out.stdout).toContain('merged');

    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['branch-key'] },
      },
    });

    expect(keys.data?.page?.totalElements).toBe(1);
  });

  it('fails on conflicts and prints them (option)', async () => {
    await createBranch(client, 'feature-branch');

    await createKey(client, 'conflict-key', {
      translations: { en: 'Default branch' },
    });
    await createKey(client, 'conflict-key', {
      branch: 'feature-branch',
      translations: { en: 'Feature branch' },
    });

    const out = await run([
      'merge',
      '--api-key',
      pak,
      '--branch',
      'feature-branch',
    ]);

    expect(out.code).not.toBe(0);

    const output = out.stdout + out.stderr;
    expect(output).toContain('x conflict-key');
    expect(output).toContain(
      `/projects/${client.getProjectId()}/branches/merge/`
    );
  });
});
