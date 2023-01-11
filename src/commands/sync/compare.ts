import type { BaseOptions } from '../../options';
import { Command } from 'commander';
import ansi from 'ansi-colors';

import { extractKeysOfFiles, filterExtractionResult } from '../../extractor';
import { dumpWarnings } from '../../extractor/warnings';
import { compareKeys } from './comparator';
import { EXTRACTOR } from '../../options';

type Options = BaseOptions & {
  extractor: string;
};

type PartialKey = { keyName: string; namespace?: string };

function printKey(key: PartialKey, type: 'added' | 'removed') {
  const namespace = key.namespace
    ? ` ${ansi.italic(`(namespace: ${key.namespace})`)}`
    : '';

  if (type === 'added') {
    console.log(`${ansi.green(`+ ${key.keyName}`)}${namespace}`);
  } else {
    console.log(`${ansi.red(`- ${key.keyName}`)}${namespace}`);
  }
}

async function compareHandler(this: Command, pattern: string) {
  const opts: Options = this.optsWithGlobals();

  const rawKeys = await extractKeysOfFiles(pattern, opts.extractor);
  dumpWarnings(rawKeys);

  const localKeys = await filterExtractionResult(rawKeys);
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
    console.log(ansi.green.bold(`${diff.added.length} new strings`));
    for (const key of diff.added) {
      printKey(key, 'added');
    }

    // Line break
    console.log('');
  }

  if (diff.removed.length) {
    console.log(ansi.red.bold(`${diff.removed.length} removed strings`));
    for (const key of diff.removed) {
      printKey(key, 'removed');
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