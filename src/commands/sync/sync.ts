import type { BaseOptions } from '../../options.js';
import { Command } from 'commander';
import ansi from 'ansi-colors';

import {
  extractKeysOfFiles,
  filterExtractionResult,
} from '../../extractor/runner.js';
import { dumpWarnings } from '../../extractor/warnings.js';
import { type PartialKey, compareKeys, printKey } from './syncUtils.js';

import { prepareDir } from '../../utils/prepareDir.js';
import { unzipBuffer } from '../../utils/zip.js';
import { askBoolean } from '../../utils/ask.js';
import { loading, error } from '../../utils/logger.js';
import { Schema } from '../../schema.js';
import { BaseExtractOptions } from '../extract.js';
import { errorFromLoadable } from '../../client/newClient/errorFromLoadable.js';
import { TolgeeClient } from '../../client/newClient/TolgeeClient.js';

type Options = BaseOptions &
  BaseExtractOptions & {
    backup?: string;
    removeUnused?: boolean;
    continueOnWarning?: boolean;
    yes?: boolean;
  };

async function backup(client: TolgeeClient, dest: string) {
  const loadable = await client.export.export({
    format: 'JSON',
    supportArrays: false,
    filterState: ['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'],
    structureDelimiter: '',
  });

  if (loadable.error) {
    error(errorFromLoadable(loadable));
    process.exit(1);
  }

  const blob = loadable.data!;

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

const syncHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: Options = this.optsWithGlobals();

    const patterns = opts.patterns?.length ? opts.patterns : config.patterns;

    if (!patterns?.length) {
      error('Missing argument <patterns>');
      process.exit(1);
    }

    const rawKeys = await loading(
      'Analyzing code...',
      extractKeysOfFiles(patterns, opts.extractor)
    );
    const warnCount = dumpWarnings(rawKeys);
    if (!opts.continueOnWarning && warnCount) {
      console.log(ansi.bold.red('Aborting as warnings have been emitted.'));
      process.exit(1);
    }

    const localKeys = filterExtractionResult(rawKeys);
    const allKeysLoadable = await opts.client.GET(
      '/v2/projects/{projectId}/all-keys',
      {
        params: { path: { projectId: opts.client.getProjectId() } },
      }
    );

    if (allKeysLoadable.error) {
      error(errorFromLoadable(allKeysLoadable));
      process.exit(1);
    }

    const remoteKeys = allKeysLoadable.data?._embedded?.keys ?? [];

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

    const projectLoadable = await opts.client.GET('/v2/projects/{projectId}', {
      params: { path: { projectId: opts.client.getProjectId() } },
    });

    if (projectLoadable.error) {
      error(errorFromLoadable(projectLoadable));
      process.exit(1);
    }

    const baseLanguage = projectLoadable.data!.baseLanguage;

    if (!baseLanguage) {
      // I'm highly unsure how we could reach this state, but this is what the OAI spec tells me ¯\_(ツ)_/¯
      error('Your project does not have a base language!');
      process.exit(1);
    }

    // Prepare backup
    if (opts.backup) {
      await prepareDir(opts.backup, opts.yes);
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

      const loadable = await loading(
        'Creating missing keys...',
        opts.client.POST('/v2/projects/{projectId}/keys/import', {
          params: { path: { projectId: opts.client.getProjectId() } },
          body: { keys },
        })
      );

      if (loadable.error) {
        error(errorFromLoadable(loadable));
        process.exit(1);
      }
    }

    if (opts.removeUnused) {
      // Delete unused keys.
      if (diff.removed.length) {
        if (!opts.yes) {
          await askForConfirmation(diff.removed, 'deleted');
        }

        const ids = await diff.removed.map((k) => k.id);
        const loadable = await loading(
          'Deleting unused keys...',
          opts.client.DELETE('/v2/projects/{projectId}/keys', {
            params: { path: { projectId: opts.client.getProjectId() } },
            body: { ids },
          })
        );

        if (loadable.error) {
          error(errorFromLoadable(loadable));
          process.exit(1);
        }
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
          `- ${diff.removed.length} string${
            diff.removed.length === 1 ? '' : 's'
          }`
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
  };

export default (config: Schema) =>
  new Command()
    .name('sync')
    .description(
      'Synchronizes the keys in your code project and in the Tolgee project, by creating missing keys and optionally deleting unused ones. For a dry-run, use `tolgee compare`.'
    )
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
    .option(
      '--remove-unused',
      'Also delete unused keys from the Tolgee project.'
    )
    .action(syncHandler(config));
