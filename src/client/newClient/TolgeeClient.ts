import { ApiClientProps, createApiClient } from './ApiClient.js';
import { createExportClient } from './ExportClient.js';
import { createImportClient } from './ImportClient.js';

type Props = ApiClientProps;

export function createTolgeeClient({ baseUrl, apiKey, projectId }: Props) {
  const apiClient = createApiClient({ baseUrl, apiKey, projectId });

  return {
    ...apiClient,
    import: createImportClient({ apiClient }),
    export: createExportClient({ apiClient }),
  };
}

export type TolgeeClient = ReturnType<typeof createTolgeeClient>;
