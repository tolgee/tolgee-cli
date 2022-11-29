import { join, extname } from 'path';
import { existsSync } from 'fs';
import { glob as globCb } from 'glob';

import { callWorker } from './worker';

import { promisify } from 'util';
const glob = promisify(globCb);

export type Key = {
  keyName: string;
  defaultValue?: string;
  namespace?: string;
  line: number;
};

export type Warning = { warning: string; line: number };

export type Extractor = (fileContents: string, fileName: string) => string[];

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
  const result = new Map<string, { keys: Key[]; warnings: Warning[] }>();

  // Done as a map to allow concurrent execution
  await Promise.all(
    files.map(async (file) => {
      const keys = await extractKeysFromFile(file, extractor);
      result.set(file, keys);
    })
  );

  return result;
}
