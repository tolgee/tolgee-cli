import { TolgeeClient } from './TolgeeClient.js';

export const errorFromLoadable = (
  loadable: Awaited<ReturnType<TolgeeClient['GET']>> & { data?: any }
) => {
  // Unauthorized
  if (loadable.response.status === 400) {
    return 'Invalid request data.';
  }

  // Unauthorized
  if (loadable.response.status === 401) {
    return 'Missing or invalid authentication token.';
  }

  // Forbidden
  if (loadable.response.status === 403) {
    return 'You are not allowed to perform this operation.';
  }

  // Rate limited
  if (loadable.response.status === 429) {
    return "You've been rate limited. Please try again later.";
  }

  // Service Unavailable
  if (loadable.response.status === 503) {
    return 'API is temporarily unavailable. Please try again later.';
  }

  // Server error
  if (loadable.response.status >= 500) {
    return `API reported a server error (${loadable.response.status}). Please try again later.`;
  }

  return `Unknown error (HTTP ${loadable.response.status})`;
};
