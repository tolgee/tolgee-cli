import type { BaseOptions } from '../options.js';

import { extname, join } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { Command, Option } from 'commander';
import { glob } from 'glob';

import { loading, success, error, warn } from '../utils/logger.js';
import { ForceMode, Format, Schema, FileMatch } from '../schema.js';
import { askString } from '../utils/ask.js';
import { mapImportFormat } from '../utils/mapImportFormat.js';
import { TolgeeClient, handleLoadableError } from '../client/TolgeeClient.js';
import { BodyOf } from '../client/internal/schema.utils.js';

type ImportRequest = BodyOf<
  '/v2/projects/{projectId}/single-step-import',
  'post'
>;

export type File = { name: string; data: string | Buffer | Blob };
export type ImportProps = Omit<ImportRequest, 'files'> & {
  files: Array<File>;
};

type FileRecord = File & {
  language?: string;
  namespace?: string;
};

type PushOptions = BaseOptions & {
  forceMode: ForceMode;
  format: Format;
  overrideKeyDescriptions: boolean;
  convertPlaceholdersToIcu: boolean;
  languages: string[];
  namespaces: string[];
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
  const projectId = opts.client.getProjectId();
  const resolveUrl = new URL(`/projects/${projectId}/import`, opts.apiUrl).href;

  if (opts.forceMode === 'NO_FORCE') {
    error(
      `There are conflicts in the import. You can resolve them and complete the import here: ${resolveUrl}.`
    );
    process.exit(1);
  }

  if (opts.forceMode) {
    return opts.forceMode;
  }

  if (!process.stdout.isTTY) {
    error(
      `There are conflicts in the import. Please specify a --force-mode, or resolve them in your browser at ${resolveUrl}.`
    );
    process.exit(1);
  }

  warn('There are conflicts in the import. What do you want to do?');
  const resp = await askString(
    'Type "KEEP" to preserve the version on the server, "OVERRIDE" to use the version from the import, and nothing to abort: '
  );
  if (resp !== 'KEEP' && resp !== 'OVERRIDE') {
    error(
      `Aborting. You can resolve the conflicts and complete the import here: ${resolveUrl}`
    );
    process.exit(1);
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

const pushHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: PushOptions = this.optsWithGlobals();

    if (!config.push?.files) {
      throw new Error('Missing option `push.files` in configuration file.');
    }

    const filteredMatchers = config.push.files.filter((r) => {
      if (opts.languages && !opts.languages.includes(r.language)) {
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

    const params: ImportProps['params'] = {
      forceMode: opts.forceMode,
      overrideKeyDescriptions: opts.overrideKeyDescriptions,
      convertPlaceholdersToIcu: opts.convertPlaceholdersToIcu,
      fileMappings: files.map((f) => {
        const format = mapImportFormat(opts.format, extname(f.name));
        return {
          fileName: f.name,
          format: format,
          languageTag: f.language,
          namespace: f.namespace ?? '',
        };
      }),
    };

    const attempt1 = await importData(opts.client, {
      files,
      params,
    });

    if (attempt1.error) {
      if (attempt1.error.code !== 'conflict_is_not_resolved') {
        handleLoadableError(attempt1);
      }
      const forceMode = await promptConflicts(opts);
      const attempt2 = await importData(opts.client, {
        files,
        params: { ...params, forceMode },
      });
      handleLoadableError(attempt2);
    }
    success('Done!');
  };

export default (config: Schema) =>
  new Command()
    .name('push')
    .description('Pushes translations to Tolgee')
    .addOption(
      new Option(
        '-f, --force-mode <mode>',
        'What should we do with possible conflicts? If unspecified, the user will be prompted interactively, or the command will fail when in non-interactive'
      )
        .choices(['OVERRIDE', 'KEEP', 'NO_FORCE'])
        .argParser((v) => v.toUpperCase())
    )
    .addOption(
      new Option('--override-key-descriptions').default(
        config.push?.overrideKeyDescriptions ?? true
      )
    )
    .addOption(new Option('--no-override-key-descriptions').hideHelp())
    .addOption(
      new Option('--convert-placeholders-to-icu').default(
        config.push?.convertPlaceholdersToIcu ?? true
      )
    )
    .addOption(
      new Option('-l, --languages <languages...>').default(
        config.push?.languages
      )
    )
    .addOption(
      new Option('-n, --namespaces <namespaces...>').default(
        config.push?.namespaces
      )
    )
    .addOption(new Option('--no-convert-placeholders-to-icu').hideHelp())
    .action(pushHandler(config));
