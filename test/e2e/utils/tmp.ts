import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm } from 'fs/promises';

export let TMP_FOLDER: string;

export function setupTemporaryFolder() {
  beforeEach(() => {
    TMP_FOLDER = join(tmpdir(), randomUUID());
  });

  afterEach(async () => {
    try {
      await rm(TMP_FOLDER, { recursive: true });
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  });
}
