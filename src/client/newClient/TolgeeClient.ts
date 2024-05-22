import { exitWithError } from '../../utils/logger.js';
import { ApiClientProps, createApiClient } from './ApiClient.js';
import { createExportClient } from './ExportClient.js';
import { createImportClient } from './ImportClient.js';
import { errorFromLoadable } from './errorFromLoadable.js';

export type LoadableData = Awaited<ReturnType<TolgeeClient['GET']>> & {
  data?: any;
};

type Props = ApiClientProps;

export function createTolgeeClient({ baseUrl, apiKey, projectId }: Props) {
  const apiClient = createApiClient({ baseUrl, apiKey, projectId });

  return {
    ...apiClient,
    import: createImportClient({ apiClient }),
    export: createExportClient({ apiClient }),
  };
}

export const handleLoadableError = (loadable: LoadableData) => {
  if (loadable.error) {
    exitWithError(errorFromLoadable(loadable));
  }
};

export type TolgeeClient = ReturnType<typeof createTolgeeClient>;
