import type { BodyOf, QueryOf, ResponseOf } from './internal/schema.utils';

import FormData from 'form-data';
import Client from './internal/client';
import { HttpError } from './errors';

export type File = { name: string; data: string | Buffer | Blob };
export type AddFileRequest = Omit<
  BodyOf<'/v2/projects/import', 'post'>,
  'files'
> & { files: Array<File> };
export type AddFileResponse = ResponseOf<'/v2/projects/import', 'post'>[200];

export type ApplyImportRequest = QueryOf<'/v2/projects/import/apply', 'put'>;

export default class ImportClient extends Client {
  async addFiles(req: AddFileRequest): Promise<AddFileResponse> {
    const body = new FormData();
    for (const file of req.files)
      body.append('files', file.data, { filename: file.name });

    return this.requestJson({
      method: 'POST',
      path: `${this.projectUrl}/import`,
      body: body,
    });
  }

  async applyImport(req?: ApplyImportRequest): Promise<void> {
    // .requestBlob here to force the consumption of the body, according to recommendations by Undici
    // ref: https://github.com/nodejs/undici#garbage-collection
    await this.requestBlob({
      method: 'PUT',
      path: `${this.projectUrl}/import/apply`,
      query: { forceMode: req?.forceMode },
    });
  }

  async deleteImport(): Promise<void> {
    // .requestBlob here to force the consumption of the body, according to recommendations by Undici
    // ref: https://github.com/nodejs/undici#garbage-collection
    await this.requestBlob({
      method: 'DELETE',
      path: `${this.projectUrl}/import`,
    });
  }

  /* Helper functions */

  async deleteImportIfExists(): Promise<void> {
    try {
      await this.deleteImport();
    } catch (e) {
      if (e instanceof HttpError && e.response.status === 404) return;
      throw e;
    }
  }
}
