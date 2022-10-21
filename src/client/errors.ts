import type { Request, Response } from 'undici';

export class HttpError extends Error {
  constructor(
    public request: Request,
    public response: Response,
    options?: ErrorOptions
  ) {
    super(response.statusText, options);
  }
}
