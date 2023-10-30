import type { RequestData } from './internal/requester.js';
import type { Dispatcher } from 'undici';
import { STATUS_CODES } from 'http';

export class HttpError extends Error {
  constructor(
    public request: RequestData,
    public response: Dispatcher.ResponseData,
    options?: ErrorOptions
  ) {
    super(
      `HTTP Error ${response.statusCode} ${STATUS_CODES[response.statusCode]}`,
      options
    );
  }

  getErrorText() {
    // Unauthorized
    if (this.response.statusCode === 400) {
      return 'Invalid request data.';
    }

    // Unauthorized
    if (this.response.statusCode === 401) {
      return 'Missing or invalid authentication token.';
    }

    // Forbidden
    if (this.response.statusCode === 403) {
      return 'You are not allowed to perform this operation.';
    }

    // Rate limited
    if (this.response.statusCode === 429) {
      return "You've been rate limited. Please try again later.";
    }

    // Service Unavailable
    if (this.response.statusCode === 503) {
      return 'API is temporarily unavailable. Please try again later.';
    }

    // Server error
    if (this.response.statusCode >= 500) {
      return `API reported a server error (${this.response.statusCode}). Please try again later.`;
    }

    return `Unknown error (HTTP ${this.response.statusCode})`;
  }
}
