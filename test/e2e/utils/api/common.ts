import { ApiClientProps } from '../../../../src/client/ApiClient.js';
import {
  TolgeeClient,
  createTolgeeClient,
} from '../../../../src/client/TolgeeClient.js';
import { components } from '../../../../src/client/internal/schema.generated.js';
import { languagesTestData } from './languagesTestData.js';

const API_URL = 'http://localhost:22222';

export async function userLogin() {
  const loadable = await createTolgeeClient({
    baseUrl: API_URL,
    autoThrow: true,
  }).POST('/api/public/generatetoken', {
    body: { username: 'admin', password: 'admin' },
  });

  return loadable.data!.accessToken!;
}

export function createClient(
  userToken: string,
  options?: Partial<ApiClientProps>
) {
  const client = createTolgeeClient({
    baseUrl: API_URL,
    autoThrow: true,
    ...options,
  });

  client.use({
    onRequest(req) {
      req.headers.set('Authorization', 'Bearer ' + userToken);
      return undefined;
    },
  });
  return client;
}

export async function deleteProject(client: TolgeeClient) {
  await client.DELETE('/v2/projects/{projectId}', {
    params: { path: { projectId: client.getProjectId() } },
  });
}

export async function createProjectWithClient(
  name: string,
  data: components['schemas']['ImportKeysResolvableDto']
) {
  const userToken = await userLogin();
  let client = createClient(userToken!);
  const organizations = await client.GET('/v2/organizations');

  const project = await client.POST('/v2/projects', {
    body: {
      name: name,
      organizationId: organizations.data!._embedded!.organizations![0].id,
      languages: languagesTestData,
      icuPlaceholders: true,
    },
  });

  client = createClient(userToken, { projectId: project.data!.id });

  await client.POST('/v2/projects/{projectId}/keys/import-resolvable', {
    params: { path: { projectId: client.getProjectId() } },
    body: data,
  });

  return client;
}

export const DEFAULT_SCOPES = [
  'keys.view',
  'translations.view',
  'translations.edit',
  'keys.edit',
  'keys.create',
  'screenshots.view',
  'screenshots.upload',
  'screenshots.delete',
  'translations.state-edit',
];

export async function createPak(client: TolgeeClient, scopes = DEFAULT_SCOPES) {
  const apiKey = await client.POST('/v2/api-keys', {
    body: { projectId: client.getProjectId(), scopes },
  });

  return apiKey.data!.key;
}
