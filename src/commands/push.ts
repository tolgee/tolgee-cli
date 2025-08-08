import type { BaseOptions } from '../options.js';

import { extname, join } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { Command, Option } from 'commander';
import { glob } from 'tinyglobby';
import { exit } from 'process';

import {
  loading,
  success,
  error,
  warn,
  exitWithError,
} from '../utils/logger.js';
import {
  ForceMode,
  Format,
  Schema,
  FileMatch,
  OverrideMode,
  ErrorOnUnresolvedConflict,
} from '../schema.js';
import { askString } from '../utils/ask.js';
import { mapImportFormat } from '../utils/mapImportFormat.js';
import { TolgeeClient, handleLoadableError } from '../client/TolgeeClient.js';
import { BodyOf } from '../client/internal/schema.utils.js';
import { components } from '../client/internal/schema.generated.js';
import { findFilesByTemplate } from '../utils/filesTemplate.js';
import { valueToArray } from '../utils/valueToArray.js';
import { printUnresolvedConflicts } from '../utils/printFailedKeys.js';

type ImportRequest = BodyOf<
  '/v2/projects/{projectId}/single-step-import',
  'post'
>;

export type File = { name: string; data: string | Buffer | Blob };
export type ImportProps = Omit<ImportRequest, 'files'> & {
  files: Array<File>;
};

type ImportFileMapping = components['schemas']['ImportFileMapping'];

type FileRecord = File & {
  language?: string;
  namespace?: string;
};

type PushOptions = BaseOptions & {
  forceMode: ForceMode;
  format: Format;
  overrideKeyDescriptions: boolean;
  convertPlaceholdersToIcu: boolean;
  languages?: string[];
  namespaces?: string[];
  tagNewKeys?: string[];
  removeOtherKeys?: boolean;
  filesTemplate?: string[];
  overrideMode?: OverrideMode;
  errorOnUnresolvedConflict?: ErrorOnUnresolvedConflict;
};

async function allInPattern(pattern: string) {
  const files: File[] = [];
  const items = await glob(pattern);
  for (const item of items) {
    if ((await stat(item)).isDirectory()) {
      files.push(...(await readDirectory(item)));
    } else {
      const blob = await readFile(item);
      files.push({ name: item, data: blob });
    }
  }
  return files;
}

async function readDirectory(directory: string, base = ''): Promise<File[]> {
  const files: File[] = [];

  const dir = await readdir(directory);
  for (const file of dir) {
    const filePath = join(directory, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      const dirFiles = await readDirectory(filePath, `${file}/`);
      files.push(...dirFiles);
    } else {
      const blob = await readFile(filePath);
      files.push({ name: base + file, data: blob });
    }
  }

  return files;
}

async function promptConflicts(
  opts: PushOptions
): Promise<'KEEP' | 'OVERRIDE'> {
  if (opts.forceMode === 'NO_FORCE') {
    exitWithError(
      `There are conflicts in the import and the force mode is set to "NO_FORCE". Set it to "KEEP" or "OVERRIDE" to continue.`
    );
  }

  if (opts.forceMode) {
    return opts.forceMode;
  }

  if (!process.stdout.isTTY) {
    exitWithError(
      `There are conflicts in the import. Please specify a --force-mode.`
    );
  }

  warn('There are conflicts in the import. What do you want to do?');
  const resp = await askString(
    'Type "KEEP" to preserve the version on the server, "OVERRIDE" to use the version from the import, and nothing to abort: '
  );
  if (resp !== 'KEEP' && resp !== 'OVERRIDE') {
    exitWithError(`Aborting.`);
  }

  return resp;
}

async function importData(client: TolgeeClient, data: ImportProps) {
  return loading('Uploading files...', client.import.import(data));
}

async function readRecords(matchers: FileMatch[]) {
  const result: FileRecord[] = [];
  for (const matcher of matchers) {
    const files = await allInPattern(matcher.path);
    files.forEach((file) => {
      result.push({
        ...matcher,
        data: file.data,
        name: file.name,
      });
    });
  }
  return result;
}

function handleMappingError(fileMappings: ImportFileMapping[]): never {
  error('Not able to map files to existing languages in the platform');
  console.log(`Pushed files:`);
  fileMappings.forEach(({ fileName, languageTag }) => {
    console.log(`"${fileName}"${languageTag ? ` => "${languageTag}"` : ''}`);
  });
  console.log(
    '\nYou can use `push.files[*].language` property in `tolgeerc` file to map language correctly'
  );
  exit(1);
}

const pushHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: PushOptions = this.optsWithGlobals();

    let allMatchers: FileMatch[] = [];

    const filesTemplate = opts.filesTemplate;

    if (!filesTemplate && !config.push?.files?.length) {
      exitWithError('Missing option `push.filesTemplate` or `push.files`.');
    }

    if (filesTemplate) {
      for (const template of filesTemplate) {
        allMatchers = allMatchers.concat(
          ...(await findFilesByTemplate(template))
        );
      }
    }

    allMatchers = allMatchers.concat(...(config.push?.files || []));

    const filteredMatchers = allMatchers.filter((r) => {
      if (
        r.language &&
        opts.languages &&
        !opts.languages.includes(r.language)
      ) {
        return false;
      }
      if (opts.namespaces && !opts.namespaces.includes(r.namespace ?? '')) {
        return false;
      }
      return true;
    });

    const files = await loading(
      'Reading files...',
      readRecords(filteredMatchers)
    );

    if (files.length === 0) {
      error('Nothing to import.');
      return;
    }

    let errorOnUnresolvedConflict: boolean | undefined;
    switch (opts.errorOnUnresolvedConflict) {
      case 'auto':
        errorOnUnresolvedConflict = undefined;
        break;
      case 'yes':
        errorOnUnresolvedConflict = true;
        break;
      case 'no':
        errorOnUnresolvedConflict = false;
        break;
    }

    console.log(errorOnUnresolvedConflict, opts.errorOnUnresolvedConflict);

    const params: ImportProps['params'] = {
      createNewKeys: true,
      forceMode: opts.forceMode,
      overrideKeyDescriptions: opts.overrideKeyDescriptions,
      convertPlaceholdersToIcu: opts.convertPlaceholdersToIcu,
      tagNewKeys: opts.tagNewKeys ?? [],
      overrideMode: opts.overrideMode ?? 'RECOMMENDED',
      fileMappings: files.map((f) => {
        const format = mapImportFormat(opts.format, extname(f.name));
        return {
          fileName: f.name,
          format: format,
          languageTag: f.language,
          namespace: f.namespace ?? '',
          // there can be multiple languages inside the file
          // that is detected on the backend
          // and we only say which we want to import by `languageTagsToImport`
          // however we don't want to use this property,
          // when it's explicitly defined what language is in the file
          languageTagsToImport: !f.language ? opts.languages : undefined,
        };
      }),
      removeOtherKeys: opts.removeOtherKeys,
      errorOnUnresolvedConflict: errorOnUnresolvedConflict,
    };

    console.log({ errorOnFailedKey: errorOnUnresolvedConflict });

    let attempt = await loading(
      'Importing...',
      importData(opts.client, {
        files,
        params,
      })
    );

    if (attempt.error) {
      if (attempt.error.code === 'existing_language_not_selected') {
        handleMappingError(params.fileMappings);
      }
      if (attempt.error.code !== 'conflict_is_not_resolved') {
        handleLoadableError(attempt);
      }
      const forceMode = await promptConflicts(opts);
      attempt = await loading(
        'Overriding...',
        importData(opts.client, {
          files,
          params: { ...params, forceMode },
        })
      );
      handleLoadableError(attempt);
    }

    if (attempt.data?.unresolvedConflicts?.length) {
      printUnresolvedConflicts(attempt.data.unresolvedConflicts);
    }

    success('Done!');
  };

export default (config: Schema) =>
  new Command()
    .name('push')
    .description('Pushes translations to Tolgee')
    .addOption(
      new Option(
        '-ft, --files-template <templates...>',
        'A template that describes the structure of the local files and their location with file structure template format (more at: https://docs.tolgee.io/tolgee-cli/push-pull-strings#file-structure-template-format).\n\nExample: `./public/{namespace}/{languageTag}.json`\n\n'
      ).default(valueToArray(config.push?.filesTemplate))
    )
    .addOption(
      new Option(
        '-f, --force-mode <mode>',
        'What should we do with possible conflicts? If unspecified, the user will be prompted interactively, or the command will fail when in non-interactive'
      )
        .choices(['OVERRIDE', 'KEEP', 'NO_FORCE'])
        .argParser((v) => v.toUpperCase())
        .default(config.push?.forceMode)
    )
    .addOption(
      new Option(
        '--override-key-descriptions',
        'Override existing key descriptions from local files (only relevant for some formats).'
      ).default(config.push?.overrideKeyDescriptions ?? true)
    )
    .addOption(
      new Option(
        '--convert-placeholders-to-icu',
        'Convert placeholders in local files to ICU format.'
      ).default(config.push?.convertPlaceholdersToIcu ?? true)
    )
    .addOption(
      new Option(
        '-l, --languages <languages...>',
        'Specifies which languages should be pushed (see push.files in config).'
      ).default(config.push?.languages)
    )
    .addOption(
      new Option(
        '-n, --namespaces <namespaces...>',
        'Specifies which namespaces should be pushed (see push.files in config).'
      ).default(config.push?.namespaces)
    )
    .addOption(
      new Option(
        '--tag-new-keys <tags...>',
        'Specify tags that will be added to newly created keys.'
      ).default(config.push?.tagNewKeys)
    )
    .addOption(
      new Option(
        '--remove-other-keys',
        'Remove keys which are not present in the import (within imported namespaces).'
      ).default(config.push?.removeOtherKeys)
    )
    .addOption(
      new Option(
        '--override-mode <mode>',
        'Specifies what is considered non-overridable translation.'
      )
        .choices(['RECOMMENDED', 'ALL'])
        .default(config.push?.overrideMode)
    )
    .addOption(
      new Option(
        '--error-on-unresolved-conflict <choice>',
        'Fail the whole import if there are unresolved conflicts.'
      )
        .choices(['yes', 'no', 'auto'])
        .default(config.push?.errorOnUnresolvedConflict ?? 'auto')
    )
    .action(pushHandler(config));
