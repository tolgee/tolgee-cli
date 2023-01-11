import type { ResponseOf } from './internal/schema.utils';

import Requester from './internal/requester';

type ResponseAllKeys = ResponseOf<
  '/v2/projects/{projectId}/all-keys',
  'get'
>[200];
export type AllKeys = Exclude<
  Exclude<ResponseAllKeys['_embedded'], undefined>['keys'],
  undefined
>;

export default class ProjectClient {
  constructor(private requester: Requester) {}

  async fetchAllKeys(): Promise<AllKeys> {
    return this.requester
      .requestJson({
        method: 'GET',
        path: `${this.requester.projectUrl}/all-keys`,
      })
      .then((r: any) => r._embedded.keys);
  }
}
