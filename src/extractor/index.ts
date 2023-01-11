import { join, extname } from 'path';
import { existsSync } from 'fs';
import { glob as globCb } from 'glob';

import { callWorker } from './worker';

import { promisify } from 'util';
const glob = promisify(globCb);

export const NullNamespace = Symbol('namespace.null');

export type Key = {
  keyName: string;
  defaultValue?: string;
  namespace?: string;
};

export type ExtractedKey = Key & {
  line: number;
};

export type Warning = { warning: string; line: number };

export type Extractor = (fileContents: string, fileName: string) => string[];

export type ExtractionResult = Map<
  string,
  { keys: ExtractedKey[]; warnings: Warning[] }
>;

export type FilteredKeys = {
  [NullNamespace]: Map<string, string | null>;
  [key: string]: Map<string, string | null>;
};

function resolveExtractor(extractor: string): string {
  if (!existsSync(extractor)) {
    // During dev, we deal with .ts files because of ts-node
    const preset = join(
      __dirname,
      'presets',
      `${extractor}${extname(__filename)}`
    );

    if (!existsSync(preset)) {
      throw new Error(`Cannot find specified extractor: ${extractor}`);
    }

    return preset;
  }

  return extractor;
}

export async function extractKeysFromFile(file: string, extractor: string) {
  return callWorker({
    extractor: resolveExtractor(extractor),
    file: file,
  });
}

export async function extractKeysOfFiles(
  filesPattern: string,
  extractor: string
) {
  const files = await glob(filesPattern, { nodir: true });
  const result = new Map<
    string,
    { keys: ExtractedKey[]; warnings: Warning[] }
  >();

  for (const file of files) {
    const keys = await extractKeysFromFile(file, extractor);
    result.set(file, keys);
  }

  return result;
}

export function filterExtractionResult(data: ExtractionResult): FilteredKeys {
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
