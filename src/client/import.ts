import type { BodyOf } from './internal/schema.utils.js';

import FormData from 'form-data';
import Requester from './internal/requester.js';

type ImportRequest = BodyOf<
  '/v2/projects/{projectId}/single-step-import',
  'post'
>;

export type File = { name: string; data: string | Buffer | Blob };
export type ImportProps = Omit<ImportRequest, 'files'> & {
  files: Array<File>;
};

export default class ImportClient {
  constructor(private requester: Requester) {}

  async import(req: ImportProps) {
    const body = new FormData();
    for (const file of req.files) {
      body.append('files', file.data, { filepath: file.name });
    }

    body.append('params', JSON.stringify(req.params));

    return this.requester.requestVoid({
      method: 'POST',
      path: `${this.requester.projectUrl}/single-step-import`,
      body: body,
    });
  }
}
