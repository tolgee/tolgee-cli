import type { BaseOptions } from '../../options.js';
import type Client from '../../client/index.js';
import { Command } from 'commander';
import ansi from 'ansi-colors';

import {
  extractKeysOfFiles,
  filterExtractionResult,
} from '../../extractor/runner.js';
import { dumpWarnings } from '../../extractor/warnings.js';
import { type PartialKey, compareKeys, printKey } from './syncUtils.js';

import { overwriteDir } from '../../utils/overwriteDir.js';
import { unzipBuffer } from '../../utils/zip.js';
import { askBoolean } from '../../utils/ask.js';
import { loading, error } from '../../utils/logger.js';

import { EXTRACTOR } from '../../options.js';

type Options = BaseOptions & {
  extractor: string;
  backup?: string;
  removeUnused?: boolean;
  continueOnWarning?: boolean;
  yes?: boolean;
};

async function backup(client: Client, dest: string) {
  const blob = await client.export.export({
    format: 'JSON',
    filterState: ['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'],
    structureDelimiter: '',
  });

  await unzipBuffer(blob, dest);
}

async function askForConfirmation(
  keys: PartialKey[],
  operation: 'created' | 'deleted'
) {
  if (!process.stdout.isTTY) {
    error(
      'You must run this command interactively, or specify --yes to proceed.'
    );
    process.exit(1);
  }

  const str = `The following keys will be ${operation}:`;
  console.log(
    operation === 'created' ? ansi.bold.green(str) : ansi.bold.red(str)
  );
  keys.forEach((k) => printKey(k, operation === 'deleted'));

  const shouldContinue = await askBoolean('Does this look correct?', true);
  if (!shouldContinue) {
    error('Aborting.');
    process.exit(1);
  }
}

async function syncHandler(this: Command, pattern: string) {
  const opts: Options = this.optsWithGlobals();

  const rawKeys = await loading(
    'Analyzing code...',
    extractKeysOfFiles(pattern, opts.extractor)
  );
  const warnCount = dumpWarnings(rawKeys);
  if (!opts.continueOnWarning && warnCount) {
    console.log(ansi.bold.red('Aborting as warnings have been emitted.'));
    process.exit(1);
  }

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

  // Load project settings. We're interested in the default locale here.
  const { baseLanguage } = await opts.client.project.fetchProjectInformation();
  if (!baseLanguage) {
    // I'm highly unsure how we could reach this state, but this is what the OAI spec tells me ¯\_(ツ)_/¯
    error('Your project does not have a base language!');
    process.exit(1);
  }

  // Prepare backup
  if (opts.backup) {
    await overwriteDir(opts.backup, opts.yes);
    await loading(
      'Backing up Tolgee project',
      backup(opts.client, opts.backup)
    );
  }

  // Create new keys
  if (diff.added.length) {
    if (!opts.yes) {
      await askForConfirmation(diff.added, 'created');
    }

    const keys = diff.added.map((key) => ({
      name: key.keyName,
      namespace: key.namespace,
      translations: key.defaultValue
        ? { [baseLanguage.tag]: key.defaultValue }
        : {},
    }));

    await loading(
      'Creating missing keys...',
      opts.client.project.createBulkKey(keys)
    );
  }

  if (opts.removeUnused) {
    // Delete unused keys.
    if (diff.removed.length) {
      if (!opts.yes) {
        await askForConfirmation(diff.removed, 'deleted');
      }

      const ids = await diff.removed.map((k) => k.id);
      await loading(
        'Deleting unused keys...',
        opts.client.project.deleteBulkKeys(ids)
      );
    }
  }

  console.log(ansi.bold.green('Sync complete!'));
  console.log(
    ansi.green(
      `+ ${diff.added.length} string${diff.added.length === 1 ? '' : 's'}`
    )
  );

  if (opts.removeUnused) {
    console.log(
      ansi.red(
        `- ${diff.removed.length} string${diff.removed.length === 1 ? '' : 's'}`
      )
    );
  } else {
    console.log(
      ansi.italic(
        `${diff.removed.length} unused key${
          diff.removed.length === 1 ? '' : 's'
        } could be deleted.`
      )
    );
  }

  if (opts.backup) {
    console.log(
      ansi.blueBright(
        `A backup of the project prior to the synchronization has been dumped in ${opts.backup}.`
      )
    );
  }
}

export default new Command()
  .name('sync')
  .description(
    'Synchronizes the keys in your code project and in the Tolgee project, by creating missing keys and optionally deleting unused ones. For a dry-run, use `tolgee compare`.'
  )
  .argument(
    '<pattern>',
    'File pattern to include (hint: make sure to escape it in quotes, or your shell might attempt to unroll some tokens like *)'
  )
  .addOption(EXTRACTOR)
  .option(
    '-B, --backup <path>',
    'Path where a backup should be downloaded before performing the sync. If something goes wrong, the backup can be used to restore the project to its previous state.'
  )
  .option(
    '--continue-on-warning',
    'Set this flag to continue the sync if warnings are detected during string extraction. By default, as warnings may indicate an invalid extraction, the CLI will abort the sync.'
  )
  .option(
    '-Y, --yes',
    'Skip prompts and automatically say yes to them. You will not be asked for confirmation before creating/deleting keys.'
  )
  .option('--remove-unused', 'Also delete unused keys from the Tolgee project.')
  .action(syncHandler);
