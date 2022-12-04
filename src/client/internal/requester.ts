import { Request, Response } from 'undici';
import type { Blob } from 'buffer';
import type { components } from './schema.generated';

import { fetch } from 'undici';
import FormData from 'form-data';

import { HttpError } from '../errors';
import { debug } from '../../utils/logger';
import { USER_AGENT } from '../../constants';

export type RequesterParams =
  | { apiUrl: string | URL; apiKey: `tgpat_${string}`; projectId: number }
  | { apiUrl: string | URL; apiKey: string; projectId?: number };

// I'd love to strictly type the path & stuff...
// But it's a pain to do so with the generated schema unless request code is written in a super specific way.
// Considering this is internal, it's not that big of a deal. ¯\_(ツ)_/¯
type Primitive = string | boolean | number;
export type RequestData = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  query?: Record<string, Primitive | Primitive[] | undefined>;
  headers?: Record<string, string>;
};

export type PaginatedView<T> = {
  data: T;
  page: components['schemas']['PageMetadata'];

  hasNext: () => boolean;
  next: () => Promise<PaginatedView<T> | null>;

  hasPrevious: () => boolean;
  previous: () => Promise<PaginatedView<T> | null>;
};

// Helper API type
type PagedView = {
  _embedded: any;
  _links: Record<string, { href: string }>;
  page: components['schemas']['PageMetadata'];
};

export default class Requester {
  constructor(private params: RequesterParams) {}

  get projectUrl() {
    return `/v2/projects/${this.params.projectId}`;
  }

  /**
   * Performs an HTTP request to the API
   *
   * @param req Request data
   * @returns The response
   */
  async request(req: RequestData): Promise<Response> {
    const url = new URL(req.path, this.params.apiUrl);

    if (req.query) {
      for (const param in req.query) {
        if (param in req.query) {
          const val = req.query[param];
          if (val !== undefined) {
            if (Array.isArray(val)) {
              for (const v of val) {
                url.searchParams.append(param, String(v));
              }
            } else {
              url.searchParams.set(param, String(val));
            }
          }
        }
      }
    }

    const headers: Record<string, string> = {
      ...(req.headers || {}),
      'user-agent': USER_AGENT,
      'x-api-key': this.params.apiKey,
    };

    let body = undefined;

    if (req.body) {
      if (req.body instanceof FormData) {
        const header = `multipart/form-data; boundary=${req.body.getBoundary()}`;
        headers['content-type'] = header;
        body = req.body.getBuffer();
      } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(req.body);
      }
    }

    const request = new Request(url, {
      method: req.method,
      headers: headers,
      body: body,
    });

    debug(`[HTTP] Requesting: ${request.method} ${request.url}`);
    const response = await fetch(request);

    debug(
      `[HTTP] ${request.method} ${request.url} -> ${response.status} ${response.statusText}`
    );
    if (!response.ok) throw new HttpError(request, response);
    return response;
  }

  /**
   * Performs an HTTP request to the API and returns the result as a JSON object
   *
   * @param req Request data
   * @returns The response data
   */
  async requestJson<T = unknown>(req: RequestData): Promise<T> {
    return <Promise<T>>this.request(req).then((r) => r.json());
  }

  /**
   * Performs an HTTP request to the API and returns the result as a Blob
   *
   * @param req Request data
   * @returns The response blob
   */
  async requestBlob(req: RequestData): Promise<Blob> {
    return this.request(req).then((r) => r.blob());
  }

  /**
   * Performs an HTTP request to the API and forces the consumption of the body, according to recommendations by Undici
   *
   * @see https://github.com/nodejs/undici#garbage-collection
   * @param req Request data
   */
  async requestVoid(req: RequestData): Promise<void> {
    const res = await this.request(req);
    if (res.body) {
      for await (const _chunk of res.body);
    }
  }

  /**
   * Performs an HTTP request to the API to a resource which is paginated.
   * The returned result is a view with helpers to get next (or previous) data.
   *
   * @param req Request data
   */
  async requestPaginatedResource<T = unknown>(
    req: RequestData
  ): Promise<PaginatedView<T>> {
    const res = await this.requestJson<PagedView>(req);

    const _this = this;
    const view: PaginatedView<T> = {
      data: res._embedded,
      page: res.page,
      hasNext() {
        return !!res._links.next?.href;
      },
      hasPrevious() {
        return !!res._links.prev?.href;
      },
      async next() {
        if (!this.hasNext()) return null;
        return _this.requestPaginatedResource({
          ...req,
          path: res._links.next.href,
          query: undefined,
        });
      },
      async previous() {
        if (!this.hasPrevious()) return null;
        return _this.requestPaginatedResource({
          ...req,
          path: res._links.prev.href,
          query: undefined,
        });
      },
    };

    return view;
  }
}
