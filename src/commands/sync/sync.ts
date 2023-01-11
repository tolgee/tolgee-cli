import type { BaseOptions } from '../../options';
import type Client from '../../client';
import { Command } from 'commander';
import ansi from 'ansi-colors';

import { extractKeysOfFiles, filterExtractionResult } from '../../extractor';
import { dumpWarnings } from '../../extractor/warnings';
import { compareKeys } from './comparator';

import { overwriteDir } from '../../utils/overwriteDir';
import { unzipBuffer } from '../../utils/zip';
import { loading, error } from '../../utils/logger';

import { EXTRACTOR } from '../../options';

type Options = BaseOptions & {
  extractor: string;
  backup?: string;
  keepUnused?: boolean;
  abortOnWarning?: boolean;
};

async function backup(client: Client, dest: string) {
  const blob = await client.export.export({
    format: 'JSON',
    filterState: ['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'],
    structureDelimiter: '',
  });

  await unzipBuffer(blob, dest);
}

async function compareHandler(this: Command, pattern: string) {
  const opts: Options = this.optsWithGlobals();

  const rawKeys = await extractKeysOfFiles(pattern, opts.extractor);
  const warnCount = dumpWarnings(rawKeys);
  if (opts.abortOnWarning && warnCount) {
    console.log(ansi.bold.red('Aborting as warnings have been emitted.'));
    process.exit(1);
  }

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

  // Load project settings. We're interested in the default locale here.
  const project = await opts.client.project.fetchProjectInformation();
  if (!project.baseLanguage) {
    // I'm highly unsure how we could reach this state, but this is what the OAI spec tells me ¯\_(ツ)_/¯
    error('Your project does not have a base language!');
    process.exit(1);
  }

  // Prepare backup
  if (opts.backup) {
    await overwriteDir(opts.backup);
    await loading(
      'Backing up Tolgee project',
      backup(opts.client, opts.backup)
    );
  }

  // Create new keys
  if (diff.added.length) {
    for (const key of diff.added) {
      await opts.client.project.createKey({
        name: key.keyName,
        namespace: key.namespace,
        translations: key.defaultValue
          ? { [project.baseLanguage.tag]: key.defaultValue }
          : undefined,
      });
    }
  }

  if (!opts.keepUnused) {
    // Delete unused keys.
    if (diff.removed.length) {
      const ids = await diff.removed.map((k) => k.id);
      await opts.client.project.deleteBulkKeys(ids);
    }
  }

  console.log(ansi.bold.green('Sync complete!'));
  console.log(
    ansi.green(
      `+ ${diff.added.length} string${diff.added.length === 1 ? '' : 's'}`
    )
  );
  if (!opts.keepUnused) {
    console.log(
      ansi.red(
        `- ${diff.removed.length} string${diff.removed.length === 1 ? '' : 's'}`
      )
    );
  } else {
    console.log(ansi.italic('Unused key deletion skipped'));
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
    'Synchronizes the keys in your code project and in the Tolgee project, by creating missing keys and deleting unused ones. For a dry-run, use `tolgee compare`.'
  )
  .argument(
    '<pattern>',
    'File pattern to include (hint: make sure to escape it in quotes, or your shell might attempt to unroll some tokens like *)'
  )
  .addOption(EXTRACTOR)
  .option(
    '--backup <path>',
    'Path where a backup should be downloaded before performing the sync. If something goes wrong, the backup can be used to restore the project to its previous state.'
  )
  .option(
    '-Werror, --abort-on-warning',
    'Set this flag to abort the sync if warnings are detected during string extraction.'
  )
  .option('-k, --keep-unused', 'Skip deleting unused keys.')
  .action(compareHandler);
