import type { BodyOf, QueryOf, ResponseOf } from './internal/schema.utils.js';

import FormData from 'form-data';
import Requester from './internal/requester.js';
import { HttpError } from './errors.js';

type ImportRequest = BodyOf<'/v2/projects/{projectId}/import', 'post'>;

export type File = { name: string; data: string | Buffer | Blob };
export type AddFileRequest = Omit<ImportRequest, 'files'> & {
  files: Array<File>;
};
export type AddFileResponse = ResponseOf<
  '/v2/projects/{projectId}/import',
  'post'
>[200];

export type ApplyImportRequest = QueryOf<
  '/v2/projects/{projectId}/import/apply',
  'put'
>;

export default class ImportClient {
  constructor(private requester: Requester) {}

  async addFiles(req: AddFileRequest): Promise<AddFileResponse> {
    const body = new FormData();
    for (const file of req.files) {
      body.append('files', file.data, { filepath: file.name });
    }

    return this.requester.requestJson({
      method: 'POST',
      path: `${this.requester.projectUrl}/import`,
      body: body,
    });
  }

  async conflictsOverrideAll(languageId: number): Promise<void> {
    await this.requester.requestVoid({
      method: 'PUT',
      path: `${this.requester.projectUrl}/import/result/languages/${languageId}/resolve-all/set-override`,
    });
  }

  async conflictsKeepExistingAll(languageId: number): Promise<void> {
    await this.requester.requestVoid({
      method: 'PUT',
      path: `${this.requester.projectUrl}/import/result/languages/${languageId}/resolve-all/set-keep-existing`,
    });
  }

  async applyImport(req?: ApplyImportRequest): Promise<void> {
    await this.requester.requestVoid({
      method: 'PUT',
      path: `${this.requester.projectUrl}/import/apply`,
      query: { forceMode: req?.forceMode },
    });
  }

  async deleteImport(): Promise<void> {
    await this.requester.requestVoid({
      method: 'DELETE',
      path: `${this.requester.projectUrl}/import`,
    });
  }

  /* Helper functions */

  async deleteImportIfExists(): Promise<void> {
    try {
      await this.deleteImport();
    } catch (e) {
      if (e instanceof HttpError && e.response.statusCode === 404) return;
      throw e;
    }
  }
}
