import type { ExtractionResults } from '.';
import { glob as globCb } from 'glob';

import { callWorker } from './worker';

import { promisify } from 'util';
const glob = promisify(globCb);

export const NullNamespace = Symbol('namespace.null');

export type FilteredKeys = {
  [NullNamespace]: Map<string, string | null>;
  [key: string]: Map<string, string | null>;
};

export async function extractKeysFromFile(file: string, extractor?: string) {
  return callWorker({
    extractor: extractor,
    file: file,
  });
}

export async function extractKeysOfFiles(
  filesPattern: string,
  extractor: string
) {
  const files = await glob(filesPattern, { nodir: true });
  const result: ExtractionResults = new Map();

  await Promise.all(
    files.map(async (file) => {
      const keys = await extractKeysFromFile(file, extractor);
      result.set(file, keys);
    })
  );

  return result;
}

export function filterExtractionResult(data: ExtractionResults): FilteredKeys {
  const result: FilteredKeys = Object.create(null);
  for (const { keys } of data.values()) {
    for (const key of keys) {
      const namespace = key.namespace || NullNamespace;
      if (!(namespace in result)) {
        result[namespace] = new Map();
      }

      result[namespace].set(key.keyName, key.defaultValue || null);
    }
  }

  return result;
}
