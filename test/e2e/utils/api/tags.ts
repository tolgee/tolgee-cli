import { TolgeeClient } from '#cli/client/TolgeeClient.js';

export async function createTestTags(client: TolgeeClient) {
  await client.PUT('/v2/projects/{projectId}/tag-complex', {
    params: { path: { projectId: client.getProjectId() } },
    body: {
      filterKeys: ['controller', 'desk'].map((key) => ({
        name: key,
      })),
      tagFiltered: ['production-v12'],
    },
  });
  await client.PUT('/v2/projects/{projectId}/tag-complex', {
    params: { path: { projectId: client.getProjectId() } },
    body: {
      filterKeys: ['mouse'].map((key) => ({
        name: key,
      })),
      tagFiltered: ['draft-test-branch'],
    },
  });
  await client.PUT('/v2/projects/{projectId}/tag-complex', {
    params: { path: { projectId: client.getProjectId() } },
    body: {
      filterKeys: ['screen'].map((key) => ({
        name: key,
      })),
      tagFiltered: ['deprecated-v11'],
    },
  });
}

export const ORIGINAL_TAGS = {
  controller: ['production-v12'],
  desk: ['production-v12'],
  keyboard: [],
  remote: [],
  mouse: ['draft-test-branch'],
  screen: ['deprecated-v11'],
} as const;

export async function getTagsMap(client: TolgeeClient) {
  const keys = await client.GET('/v2/projects/{projectId}/translations', {
    params: {
      path: { projectId: client.getProjectId() },
      query: { languages: ['en', 'cs'] },
    },
  });

  const result: Record<string, string[]> = {};

  keys.data?._embedded?.keys?.forEach((key) => {
    result[key.keyName] = key.keyTags.map((t) => t.name);
  });
  return result;
}
