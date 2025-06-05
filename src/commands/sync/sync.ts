import type { BaseOptions } from '../../options.js';
import { Command, Option } from 'commander';
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
import { loading, exitWithError } from '../../utils/logger.js';
import { Schema } from '../../schema.js';

import {
  TolgeeClient,
  handleLoadableError,
} from '../../client/TolgeeClient.js';

type Options = BaseOptions & {
  backup?: string | false;
  removeUnused?: boolean;
  continueOnWarning?: boolean;
  namespaces?: string[];
  yes?: boolean;
  tagNewKeys?: string[];
};

async function backup(client: TolgeeClient, dest: string) {
  const loadable = await client.export.export({
    format: 'JSON',
    supportArrays: false,
    filterState: ['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'],
    structureDelimiter: '',
  });

  handleLoadableError(loadable);

  const blob = loadable.data!;

  await unzipBuffer(blob, dest);
}

async function askForConfirmation(
  keys: PartialKey[],
  operation: 'created' | 'deleted'
) {
  if (!process.stdout.isTTY) {
    exitWithError(
      'You must run this command interactively, or specify --yes to proceed.'
    );
  }

  const str = `The following keys will be ${operation}:`;
  console.log(
    operation === 'created' ? ansi.bold.green(str) : ansi.bold.red(str)
  );
  keys.forEach((k) => printKey(k, operation === 'deleted'));

  const shouldContinue = await askBoolean('Does this look correct?', true);
  if (!shouldContinue) {
    exitWithError('Aborting.');
  }
}

const syncHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: Options = this.optsWithGlobals();

    const rawKeys = await loading(
      'Analyzing code...',
      extractKeysOfFiles(opts)
    );
    const warnCount = dumpWarnings(rawKeys);
    if (!opts.continueOnWarning && warnCount) {
      console.log(ansi.bold.red('Aborting as warnings have been emitted.'));
      process.exit(1);
    }

    const localKeys = filterExtractionResult(rawKeys);

    if (opts.namespaces?.length) {
      for (const namespace of Object.keys(localKeys)) {
        if (!opts.namespaces?.includes(namespace)) {
          localKeys[namespace].clear();
        }
      }
    }

    const allKeysLoadable = await opts.client.GET(
      '/v2/projects/{projectId}/all-keys',
      {
        params: { path: { projectId: opts.client.getProjectId() } },
      }
    );

    handleLoadableError(allKeysLoadable);

    let remoteKeys = allKeysLoadable.data?._embedded?.keys ?? [];

    if (opts.namespaces?.length) {
      remoteKeys = remoteKeys.filter((key) => {
        return opts.namespaces?.includes(key.namespace ?? '');
      });
    }

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

    handleLoadableError(projectLoadable);

    const baseLanguage = projectLoadable.data!.baseLanguage;

    if (!baseLanguage) {
      // I'm highly unsure how we could reach this state, but this is what the OAI spec tells me ¯\_(ツ)_/¯
      exitWithError('Your project does not have a base language!');
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
        tags: opts.tagNewKeys,
      }));

      const loadable = await loading(
        'Creating missing keys...',
        opts.client.POST('/v2/projects/{projectId}/keys/import', {
          params: { path: { projectId: opts.client.getProjectId() } },
          body: { keys },
        })
      );

      handleLoadableError(loadable);
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

        handleLoadableError(loadable);
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
    .addOption(
      new Option(
        '-B, --backup <path>',
        'Store translation files backup (only translation files, not states, comments, tags, etc.). If something goes wrong, the backup can be used to restore the project to its previous state.'
      ).default(config.sync?.backup ?? false)
    )
    .addOption(
      new Option(
        '--continue-on-warning',
        'Set this flag to continue the sync if warnings are detected during string extraction. By default, as warnings may indicate an invalid extraction, the CLI will abort the sync.'
      ).default(config.sync?.continueOnWarning ?? false)
    )
    .addOption(
      new Option(
        '-n, --namespaces <namespaces...>',
        'Specifies which namespaces should be synchronized.'
      ).default(config.sync?.namespaces)
    )
    .addOption(
      new Option(
        '-Y, --yes',
        'Skip prompts and automatically say yes to them. You will not be asked for confirmation before creating/deleting keys.'
      ).default(false)
    )
    .addOption(
      new Option(
        '--remove-unused',
        'Delete unused keys from the Tolgee project (within selected namespaces if specified).'
      ).default(config.sync?.removeUnused ?? false)
    )
    .option(
      '--tag-new-keys <tags...>',
      'Specify tags that will be added to newly created keys.'
    )
    .action(syncHandler(config));
