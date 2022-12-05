import type { Request, Response } from 'undici';

export class HttpError extends Error {
  constructor(
    public request: Request,
    public response: Response,
    options?: ErrorOptions
  ) {
    super(response.statusText, options);
  }

  getErrorText() {
    // Unauthorized
    if (this.response.status === 400) {
      return 'Invalid request data.';
    }

    // Unauthorized
    if (this.response.status === 401) {
      return 'Missing or invalid authentication token.';
    }

    // Forbidden
    if (this.response.status === 403) {
      return 'You are not allowed to perform this operation.';
    }

    // Service Unavailable
    if (this.response.status === 503) {
      return 'API is temporarily unavailable. Please try again later.';
    }

    // Server error
    if (this.response.status >= 500) {
      return `API reported a server error (${this.response.status}). Please try again later.`;
    }

    return `Unknown error (HTTP ${this.response.status})`;
  }
}
