import type { Response } from 'undici';

export class HttpError extends Error {
  constructor(public response: Response, options?: ErrorOptions) {
    super(response.statusText, options);
  }
}
