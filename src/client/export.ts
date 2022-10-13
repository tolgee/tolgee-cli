import type { BodyOf } from './internal/schema.utils';
import type { Blob } from 'buffer';

import Client from './internal/client';

export type ExportRequest = BodyOf<'/v2/projects/export', 'post'>;

export default class ExportClient extends Client {
  async export(req: ExportRequest): Promise<Blob> {
    return this.requestBlob({
      method: 'POST',
      path: `${this.projectUrl}/export`,
      body: req,
    });
  }
}
