import type { BodyOf } from './internal/schema.utils.js';
import type { Blob } from 'buffer';
import { ApiClient } from './ApiClient.js';

export type ExportRequest = Omit<
  BodyOf<'/v2/projects/{projectId}/export', 'post'>,
  'zip'
> & {
  ifModifiedSince?: string;
};

type SingleExportRequest = Omit<ExportRequest, 'languages'> & {
  languages: [string];
};

type ExportClientProps = {
  apiClient: ApiClient;
};

export const createExportClient = ({ apiClient }: ExportClientProps) => {
  return {
    async export(req: ExportRequest) {
      const { ifModifiedSince, ...exportReq } = req;
      const body = { ...exportReq, zip: true };
      const headers: Record<string, string> = {};
      if (ifModifiedSince) {
        headers['If-Modified-Since'] = ifModifiedSince;
      }
      const loadable = await apiClient.POST('/v2/projects/{projectId}/export', {
        params: { path: { projectId: apiClient.getProjectId() } },
        body: body,
        headers,
        parseAs: 'blob',
      });
      return { ...loadable, data: loadable.data as unknown as Blob };
    },

    async exportSingle(req: SingleExportRequest) {
      return apiClient.POST('/v2/projects/{projectId}/export', {
        params: { path: { projectId: apiClient.getProjectId() } },
        body: { ...req, zip: false },
      });
    },
  };
};

export type ExportClient = ReturnType<typeof createExportClient>;
