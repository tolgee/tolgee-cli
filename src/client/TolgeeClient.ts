import { exitWithError } from './../utils/logger.js';
import { ApiClientProps, createApiClient } from './ApiClient.js';
import { createExportClient } from './ExportClient.js';
import { createImportClient } from './ImportClient.js';
import { errorFromLoadable } from './errorFromLoadable.js';

export type LoadableData = Awaited<ReturnType<TolgeeClient['GET']>> & {
  data?: any;
};

type Props = ApiClientProps;

export function createTolgeeClient(props: Props) {
  const apiClient = createApiClient(props);

  return {
    ...apiClient,
    import: createImportClient({ apiClient }),
    export: createExportClient({ apiClient }),
  };
}

export const handleLoadableError = (loadable: LoadableData) => {
  if (loadable.error) {
    throw new LoadableError(loadable);
  }
};

export class LoadableError extends Error {
  constructor(public loadable: LoadableData) {
    super(errorFromLoadable(loadable));
  }
}

export type TolgeeClient = ReturnType<typeof createTolgeeClient>;
