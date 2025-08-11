import { fileURLToPath } from 'node:url';
import { run } from './utils/run.js';
import {
  createPak,
  createProjectWithClient,
  deleteProject,
} from './utils/api/common.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';
import { PROJECT_1 } from './utils/api/project1.js';

const FIXTURES_PATH = new URL('../__fixtures__/', import.meta.url);

const PROJECT_1_DIR = new URL('./tolgeeImportData/test1/', FIXTURES_PATH);

let client: TolgeeClient;
let pak: string;

describe('project 1', () => {
  beforeEach(async () => {
    client = await createProjectWithClient('Project 1', PROJECT_1, {
      translationProtection: 'PROTECT_REVIEWED',
    });
    pak = await createPak(client);
    await prepareData();
  });
  afterEach(async () => {
    await deleteProject(client);
  });

  it("doesn't update reviewed translation when is protected", async () => {
    const out = await run([
      '--api-key',
      pak,
      'push',
      '--force-mode',
      'OVERRIDE',
      '--verbose',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_1_DIR)),
    ]);

    expect(out.stdout.toString()).toContain(
      'Some translations cannot be updated:'
    );
    expect(out.stdout.toString()).toContain('controller');
    expect(out.code).toBe(0);

    const response = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['controller'] },
      },
    });

    const translation =
      response.data?._embedded?.keys?.[0]?.translations?.['en'].text;

    expect(translation).toEqual('Controller (old)');
  });

  it("doesn't update reviewed translation and fails when is protected", async () => {
    const out = await run([
      '--api-key',
      pak,
      'push',
      '--force-mode',
      'OVERRIDE',
      '--error-on-unresolved-conflict',
      'yes',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_1_DIR)),
    ]);

    expect(out.stdout.toString()).toContain(
      'Some translations cannot be updated:'
    );
    expect(out.stdout.toString()).toContain('controller');
    expect(out.code).toBe(1);

    const response = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['controller'] },
      },
    });

    const translation =
      response.data?._embedded?.keys?.[0]?.translations?.['en'].text;

    expect(translation).toEqual('Controller (old)');
  });

  it("update reviewed when override mode is 'ALL'", async () => {
    const out = await run([
      '--api-key',
      pak,
      'push',
      '--force-mode',
      'OVERRIDE',
      '--override-mode',
      'ALL',
      '--verbose',
      '--files-template',
      fileURLToPath(new URL(`./{languageTag}.json`, PROJECT_1_DIR)),
    ]);

    expect(out.stdout.toString()).not.toContain(
      'Some translations cannot be updated:'
    );
    expect(out.stdout.toString()).not.toContain('controller');
    expect(out.code).toBe(0);

    const response = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['controller'] },
      },
    });

    const translation =
      response.data?._embedded?.keys?.[0]?.translations?.['en'].text;

    expect(translation).toEqual('Controller');
  });

  async function prepareData() {
    const keys = await client.GET('/v2/projects/{projectId}/translations', {
      params: {
        path: { projectId: client.getProjectId() },
        query: { filterKeyName: ['controller'] },
      },
    });

    const key = keys.data?._embedded?.keys?.[0];

    await client.PUT('/v2/projects/{projectId}/translations', {
      params: { path: { projectId: client.getProjectId() } },
      body: {
        key: 'controller',
        translations: {
          en: 'Controller (old)',
        },
      },
    });

    await client.PUT(
      '/v2/projects/{projectId}/translations/{translationId}/set-state/{state}',
      {
        params: {
          path: {
            projectId: client.getProjectId(),
            translationId: key!.translations!['en']!.id!,
            state: 'REVIEWED',
          },
        },
      }
    );
  }
});
