import { LoadableData } from './TolgeeClient.js';

export const addErrorDetails = (loadable: LoadableData, showBeError = true) => {
  const items: string[] = [];
  items.push(`status: ${loadable.response.status}`);
  if (showBeError && loadable.error?.code) {
    items.push(`code: ${loadable.error.code}`);
  }
  if (loadable.response.status === 403 && loadable.error?.params?.[0]) {
    items.push(`missing scope: ${loadable.error.params[0]}`);
  }
  return `[${items.join(', ')}]`;
};

export const errorFromLoadable = (loadable: LoadableData) => {
  switch (loadable.response.status) {
    // Unauthorized
    case 400:
      return `Invalid request data ${addErrorDetails(loadable)}`;

    // Unauthorized
    case 401:
      return `Missing or invalid authentication token ${addErrorDetails(
        loadable
      )}`;

    // Forbidden
    case 403:
      return `You are not allowed to perform this operation ${addErrorDetails(
        loadable
      )}`;

    // Rate limited
    case 429:
      return `You've been rate limited. Please try again later ${addErrorDetails(
        loadable
      )}`;

    // Service Unavailable
    case 503:
      return `API is temporarily unavailable. Please try again later ${addErrorDetails(
        loadable
      )}`;

    // Server error
    case 500:
      return `API reported a server error. Please try again later ${addErrorDetails(
        loadable
      )}`;

    default:
      return `Unknown error ${addErrorDetails(loadable)}`;
  }
};
