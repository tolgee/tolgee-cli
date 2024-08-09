import type {
  ExtractOptions,
  ExtractionResults,
  ParserType,
  VerboseOption,
} from './index.js';
import { glob } from 'fast-glob';
import { extname } from 'path';

import { callWorker } from './worker.js';
import { exitWithError } from '../utils/logger.js';

export const NullNamespace = Symbol('namespace.null');

export type FilteredKeys = {
  [NullNamespace]: Map<string, string | null>;
  [key: string]: Map<string, string | null>;
};

function parseVerbose(v: VerboseOption[] | boolean | undefined) {
  return Array.isArray(v) ? v : v ? [] : undefined;
}

export async function extractKeysFromFile(
  file: string,
  parserType: ParserType,
  options: ExtractOptions,
  extractor?: string
) {
  return callWorker({
    extractor: extractor,
    parserType,
    file: file,
    options,
  });
}

export function findPossibleFrameworks(fileNames: string[]) {
  const possibleFrameworks: ParserType[] = [];
  const extensions = new Set(fileNames.map((name) => extname(name)));

  if (extensions.has('.jsx') || extensions.has('.tsx')) {
    possibleFrameworks.push('react');
  }
  if (extensions.has('.vue')) {
    possibleFrameworks.push('vue');
  }
  if (extensions.has('.svelte')) {
    possibleFrameworks.push('svelte');
  }
  return possibleFrameworks;
}

function detectParserType(fileNames: string[]): ParserType {
  const possibleFrameworks = findPossibleFrameworks(fileNames);

  if (possibleFrameworks.length === 1) {
    return possibleFrameworks[0];
  } else if (possibleFrameworks.length === 0) {
    exitWithError(
      "Couldn't detect which framework is used, use '--parser' or 'config.parser' option"
    );
  } else {
    exitWithError(
      `Detected multiple possible frameworks used (${possibleFrameworks.join(
        ', '
      )}), use '--parser' or 'config.parser' options`
    );
  }
}

type Opts = {
  patterns?: string[];
  extractor?: string;
  parser?: ParserType;
  strictNamespace?: boolean;
  defaultNamespace?: string;
  verbose?: VerboseOption[] | boolean;
};

export async function extractKeysOfFiles(opts: Opts) {
  if (!opts.patterns?.length) {
    exitWithError("Missing '--patterns' or 'config.patterns' option");
  }

  const files = await glob(opts.patterns, { onlyFiles: true });

  if (files.length === 0) {
    exitWithError('No files were matched for extraction');
  }

  let parserType = opts.parser;

  if (!parserType) {
    parserType = detectParserType(files);
  }

  const result: ExtractionResults = new Map();
  const options: ExtractOptions = {
    strictNamespace: Boolean(opts.strictNamespace),
    defaultNamespace: opts.defaultNamespace,
    verbose: parseVerbose(opts.verbose),
  };

  await Promise.all(
    files.map(async (file) => {
      const keys = await extractKeysFromFile(
        file,
        parserType,
        options,
        opts.extractor
      );
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
