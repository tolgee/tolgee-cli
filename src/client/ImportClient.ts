import type { BodyOf } from './internal/schema.utils.js';

import FormData from 'form-data';
import type { ApiClient } from './ApiClient.js';
import { pathToPossix } from '../utils/pathToPossix.js';

type ImportRequest = BodyOf<
  '/v2/projects/{projectId}/single-step-import',
  'post'
>;

export type File = { name: string; data: string | Buffer | Blob };
export type ImportProps = Omit<ImportRequest, 'files'> & {
  files: Array<File>;
};

type ImportClientProps = {
  apiClient: ApiClient;
};

export const createImportClient = ({ apiClient }: ImportClientProps) => {
  return {
    async import(data: ImportProps) {
      const body = new FormData();
      for (const file of data.files) {
        // converting paths to possix, so it's correctly matched on the server
        body.append('files', file.data, { filepath: pathToPossix(file.name) });
      }

      data.params.fileMappings = data.params.fileMappings.map((i) => ({
        ...i,
        // converting paths to possix, so it's correctly matched on the server
        fileName: pathToPossix(i.fileName),
      }));

      body.append('params', JSON.stringify(data.params));

      return apiClient.POST('/v2/projects/{projectId}/single-step-import', {
        params: { path: { projectId: apiClient.getProjectId() } },
        body: body as any,
        bodySerializer: (r: any) => {
          return (r as FormData).getBuffer();
        },
        headers: {
          'content-type': `multipart/form-data; boundary=${body.getBoundary()}`,
        },
      });
    },
  };
};
