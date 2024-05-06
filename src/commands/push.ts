import type { File, ImportProps } from '../client/import.js';
import type Client from '../client/index.js';
import type { BaseOptions } from '../options.js';

import { join, basename } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { Command, Option } from 'commander';
import { glob } from 'glob';

import { loading, success, error } from '../utils/logger.js';
import { ForceMode, Format, Schema, FileMatch } from '../schema.js';

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

async function importData(client: Client, data: ImportProps) {
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
        name: basename(file.name),
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

    await importData(opts.client, {
      files,
      params: {
        forceMode: opts.forceMode,
        overrideKeyDescriptions: opts.overrideKeyDescriptions,
        convertPlaceholdersToIcu: opts.convertPlaceholdersToIcu,
        fileMappings: files.map((f) => {
          return {
            fileName: basename(f.name),
            format: opts.format,
            languageTag: f.language,
            namespace: f.namespace,
          };
        }),
      },
    });
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
