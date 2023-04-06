import type { BaseOptions } from '../../options';
import { Command } from 'commander';
import ansi from 'ansi-colors';

import { compareKeys, printKey } from './syncUtils';
import {
  extractKeysOfFiles,
  filterExtractionResult,
} from '../../extractor/runner';
import { dumpWarnings } from '../../extractor/warnings';
import { EXTRACTOR } from '../../options';
import { loading } from '../../utils/logger';

type Options = BaseOptions & {
  extractor: string;
};

async function compareHandler(this: Command, pattern: string) {
  const opts: Options = this.optsWithGlobals();

  const rawKeys = await loading(
    'Analyzing code...',
    extractKeysOfFiles(pattern, opts.extractor)
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
    console.log(
      ansi.green.bold(
        `${diff.added.length} new ${key} found in your code project`
      )
    );
    for (const key of diff.added) {
      printKey(key, false);
    }

    // Line break
    console.log('');
  }

  if (diff.removed.length) {
    const key = diff.added.length === 1 ? 'key' : 'keys';
    console.log(
      ansi.red.bold(
        `${diff.removed.length} ${key} exist on Tolgee but were not found in your code project`
      )
    );
    for (const key of diff.removed) {
      printKey(key, true);
    }

    // Line break
    console.log('');
  }

  console.log('Run `tolgee sync` to synchronize the projects.');
}

export default new Command()
  .name('compare')
  .description(
    'Compares the keys in your code project and in the Tolgee project.'
  )
  .argument(
    '<pattern>',
    'File pattern to include (hint: make sure to escape it in quotes, or your shell might attempt to unroll some tokens like *)'
  )
  .addOption(EXTRACTOR)
  .action(compareHandler);
