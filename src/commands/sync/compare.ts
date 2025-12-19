import { Command } from 'commander';
import ansi from 'ansi-colors';

import { compareKeys, printKey } from './syncUtils.js';
import {
  extractKeysOfFiles,
  filterExtractionResult,
} from '../../extractor/runner.js';
import { dumpWarnings } from '../../extractor/warnings.js';
import { loading } from '../../utils/logger.js';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { handleLoadableError } from '../../client/TolgeeClient.js';
import { appendBranch } from '../../utils/branch.js';

type Options = BaseOptions;

const asyncHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: Options = this.optsWithGlobals();

    const rawKeys = await loading(
      'Analyzing code...',
      extractKeysOfFiles(opts)
    );
    dumpWarnings(rawKeys);

    const localKeys = filterExtractionResult(rawKeys);
    const loadable = await loading(
      `Fetching Tolgee keys${appendBranch(opts.branch)}...`,
      opts.client.GET('/v2/projects/{projectId}/all-keys', {
        params: {
          path: {
            projectId: opts.client.getProjectId(),
            query: { branch: opts.branch },
          },
        },
      })
    );

    handleLoadableError(loadable);

    const remoteKeys = loadable.data!._embedded!.keys ?? [];

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
    .action(asyncHandler(config));
