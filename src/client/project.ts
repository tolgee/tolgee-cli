import type { ResponseOf, BodyOf } from './internal/schema.utils';

import Requester from './internal/requester';

type ResponseAllKeys = ResponseOf<
  '/v2/projects/{projectId}/all-keys',
  'get'
>[200];

export type ProjectInformation = ResponseOf<
  '/v2/projects/{projectId}',
  'get'
>[200];

export type AllKeys = Exclude<
  Exclude<ResponseAllKeys['_embedded'], undefined>['keys'],
  undefined
>;

export type CreateKeyPayload = BodyOf<'/v2/projects/{projectId}/keys', 'post'>;

export type CreateKeysPayload = BodyOf<
  '/v2/projects/{projectId}/keys/import',
  'post'
>['keys'];

export type CreateKeyResponse = ResponseOf<
  '/v2/projects/{projectId}/keys',
  'post'
>[201];

export default class ProjectClient {
  constructor(private requester: Requester) {}

  async fetchProjectInformation(): Promise<ProjectInformation> {
    return this.requester.requestJson({
      method: 'GET',
      path: this.requester.projectUrl,
    });
  }

  async fetchAllKeys(): Promise<AllKeys> {
    return this.requester
      .requestJson({
        method: 'GET',
        path: `${this.requester.projectUrl}/all-keys`,
      })
      .then((r: any) => r._embedded?.keys || []);
  }

  async createKey(key: CreateKeyPayload): Promise<CreateKeyResponse> {
    return this.requester.requestJson({
      method: 'POST',
      path: `${this.requester.projectUrl}/keys`,
      body: key,
    });
  }

  async createBulkKey(keys: CreateKeysPayload): Promise<void> {
    return this.requester.requestVoid({
      method: 'POST',
      path: `${this.requester.projectUrl}/keys/import`,
      body: { keys },
    });
  }

  async deleteBulkKeys(keyIds: number[]): Promise<void> {
    return this.requester.requestVoid({
      method: 'DELETE',
      path: `${this.requester.projectUrl}/keys`,
      body: { ids: keyIds },
    });
  }
}
