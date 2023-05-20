import type { QueryOf, ResponseOf } from './internal/schema.utils.js';
import type { PaginatedView } from './internal/requester.js';

import Requester from './internal/requester.js';

export type GetLanguagesRequest = QueryOf<
  '/v2/projects/{projectId}/languages',
  'get'
>;
export type GetLanguagesResponse = ResponseOf<
  '/v2/projects/{projectId}/languages',
  'get'
>[200]['_embedded'];

export default class LanguagesClient {
  constructor(private requester: Requester) {}

  async getLanguages(
    req: GetLanguagesRequest
  ): Promise<PaginatedView<GetLanguagesResponse>> {
    return this.requester.requestPaginatedResource({
      method: 'GET',
      path: `${this.requester.projectUrl}/languages`,
      query: req,
    });
  }
}
