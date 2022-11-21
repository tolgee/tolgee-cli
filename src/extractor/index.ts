import { join, extname } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { glob as globCb } from 'glob';

import { callWorker } from './worker';

import { debug } from '../utils/logger';
import { KEY_REGEX } from '../utils/constants';
import { loadModule } from '../utils/moduleLoader';

import { promisify } from 'util';
const glob = promisify(globCb);

export type Key = { keyName: string; defaultValue?: string; namespace?: string; line: number };
export type Warning = { warning: string, line: number };

export type PossibleKey = {
  fileName: string;
  line: number;
  position: number;
};

export type Extractor = (fileContents: string) => string[];

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

export async function loadExtractor(extractor: string): Promise<Extractor> {
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

    extractor = preset;
  }

  const mdl = await loadModule(extractor);
  if (typeof mdl.default !== 'function') {
    throw new TypeError('Invalid extractor: export is not a function');
  }

  return mdl.default;
}

function findPossibleKeys(content: string) {
  const res = [];

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const match of line.matchAll(new RegExp(KEY_REGEX, 'g'))) {
      const string = match[0].trim();
      if (string)
        res.push({ string: string, line: i + 1, position: match.index! });
    }
  }

  return res;
}

export async function extractKeysFromFile(file: string, extractor: string) {
  return callWorker({
    extractor: resolveExtractor(extractor),
    file: file,
  });
}

export async function extractKeysOfFiles(
  filesPattern: string,
  extractor: string,
) {
  const files = await glob(filesPattern, { nodir: true });
  const result = new Map<string, { keys: Key[], warnings: Warning[] }>();

  // Done as a map to allow concurrent execution
  await Promise.all(
    files.map(async (file) => {
      const keys = await extractKeysFromFile(file, extractor);
      result.set(file, keys);
    })
  );

  return result;
}

export default async function extractKeysOf(
  filesPattern: string,
  params: { extractor: string }
) {
  const extractor = await loadExtractor(params.extractor);

  const files = await glob(filesPattern, { nodir: true });
  const possibleKeys: Map<string, PossibleKey[]> = new Map();
  const discoveredKeys = new Set<string>();

  for (const file of files) {
    debug(`Extracting keys in file: ${file}`);
    const content = await readFile(file, 'utf8');

    debug(`\tExtracting key-like strings`);
    for (const possibleKey of findPossibleKeys(content)) {
      if (!possibleKeys.has(possibleKey.string))
        possibleKeys.set(possibleKey.string, []);

      possibleKeys.get(possibleKey.string)!.push({
        fileName: file,
        line: possibleKey.line,
        position: possibleKey.position,
      });
    }

    debug(`\tLooking for key usage`);
    for (const key of extractor(content)) {
      discoveredKeys.add(key);
    }
  }

  return {
    keys: [...discoveredKeys],
    possibleKeys: possibleKeys,
  };
}
