import { Command } from 'commander';
import ansi from 'ansi-colors';

import type { BaseOptions } from '../../options.js';
import { compareKeys, printKey } from './syncUtils.js';
import {
  extractKeysOfFiles,
  filterExtractionResult,
} from '../../extractor/runner.js';
import { dumpWarnings } from '../../extractor/warnings.js';
import { EXTRACTOR } from '../../options.js';
import { error, loading } from '../../utils/logger.js';
import { FILE_PATTERNS } from '../../arguments.js';
import { Schema } from '../../schema.js';

type Options = BaseOptions & {
  extractor: string;
};

const asyncHandler = (config: Schema) =>
  async function (this: Command, filesPatterns: string[]) {
    const opts: Options = this.optsWithGlobals();

    const patterns = filesPatterns.length ? filesPatterns : config.patterns;

    if (!patterns?.length) {
      error('Missing argument <patterns>');
      process.exit(1);
    }

    console.log({ patterns });

    const rawKeys = await loading(
      'Analyzing code...',
      extractKeysOfFiles(patterns, opts.extractor)
    );
    dumpWarnings(rawKeys);

    const localKeys = filterExtractionResult(rawKeys);
    const remoteKeys = await opts.client.project.fetchAllKeys();

    const diff = compareKeys(localKeys, remoteKeys);
    if (!diff.added.length && !diff.removed.length) {
      console.log(
        ansi.green(
          'Your code project is in sync with the associated Tolgee project!'
        )
      );
      process.exit(0);
    }

    console.log('Your code project and Tolgee project are out of sync.');
    if (diff.added.length) {
      const key = diff.added.length === 1 ? 'key' : 'keys';
      console.log(ansi.green.bold(`${diff.added.length} new ${key} found`));
      for (const key of diff.added) {
        printKey(key, false);
      }

      // Line break
      console.log('');
    }

    if (diff.removed.length) {
      const key = diff.removed.length === 1 ? 'key' : 'keys';
      console.log(ansi.red.bold(`${diff.removed.length} unused ${key}`));
      for (const key of diff.removed) {
        printKey(key, true);
      }

      // Line break
      console.log('');
    }

    console.log('Run `tolgee sync` to synchronize the projects.');
  };

export default (config: Schema) =>
  new Command()
    .name('compare')
    .description(
      'Compares the keys in your code project and in the Tolgee project.'
    )
    .addArgument(FILE_PATTERNS)
    .addOption(EXTRACTOR)
    .action(asyncHandler(config));
