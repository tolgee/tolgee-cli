import type { ExtractorRegExp } from './regexp';

import { join } from 'path';
import { readFile } from 'fs/promises';
import { glob as globCb } from 'glob';

import { regexpExtractorRunner, validateRegExpExtractor } from './regexp';
import { debug } from '../utils/logger';
import { KEY_REGEX } from '../utils/constants';

import { promisify } from 'util';
const glob = promisify(globCb);

export type ExtractorParams = {
  preset: 'react';
  customExtractor?: string;
};

export type PossibleKey = {
  fileName: string;
  line: number;
  position: number;
};

type ExtractRunner = (fileContents: string) => string[];

export type { ExtractorRegExp };
export type ExtractorFunction = { extractor: ExtractRunner };
export type Extractor = ExtractorRegExp | ExtractorFunction;

function prepareExtractor(params: ExtractorParams): ExtractRunner {
  const extractorPath = params.customExtractor
    ? params.customExtractor
    : join(__dirname, 'presets', `${params.preset}.js`);

  const extractor = require(extractorPath);

  if (!extractor || typeof extractor !== 'object' || Array.isArray(extractor))
    throw new TypeError(
      'Invalid extractor provided: The provided extractor is not an object!'
    );

  if ('extraction' in extractor) {
    validateRegExpExtractor(extractor);
    return regexpExtractorRunner.bind(null, extractor);
  }

  if (typeof extractor.extractor !== 'function')
    throw new TypeError(
      'Invalid functional extractor provided: `extractor` is not a function!'
    );

  return extractor.extractor;
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

export default async function extractKeys(
  filesPattern: string,
  params: ExtractorParams
) {
  const extractor = prepareExtractor(params);

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
