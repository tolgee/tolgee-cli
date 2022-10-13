import type { QueryOf, ResponseOf } from './internal/schema.utils';
import type { PaginatedView } from './internal/requester';

import Requester from './internal/requester';

export type GetLanguagesRequest = QueryOf<'/v2/projects/languages', 'get'>;
export type GetLanguagesResponse = ResponseOf<
  '/v2/projects/languages',
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
