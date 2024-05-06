import type { Blob } from 'buffer';
import type { BaseOptions } from '../options.js';

import { Command, Option } from 'commander';

import { unzipBuffer } from '../utils/zip.js';
import { overwriteDir } from '../utils/overwriteDir.js';
import { error, loading, success } from '../utils/logger.js';
import { HttpError } from '../client/errors.js';
import { Schema } from '../schema.js';

type PullOptions = BaseOptions & {
  format: 'JSON' | 'XLIFF';
  languages?: string[];
  states?: Array<'UNTRANSLATED' | 'TRANSLATED' | 'REVIEWED'>;
  delimiter?: string;
  overwrite?: boolean;
  namespaces?: string[];
};

async function fetchZipBlob(opts: PullOptions): Promise<Blob> {
  return opts.client.export.export({
    format: opts.format,
    supportArrays: false,
    languages: opts.languages,
    filterState: opts.states,
    structureDelimiter: opts.delimiter,
    filterNamespace: opts.namespaces,
  });
}

const pullHandler = () =>
  async function (this: Command, path: string | undefined) {
    const opts: PullOptions = this.optsWithGlobals();

    if (!path) {
      throw new Error('Missing or argument <path>');
    }

    await overwriteDir(path, opts.overwrite);
    try {
      const zipBlob = await loading(
        'Fetching strings from Tolgee...',
        fetchZipBlob(opts)
      );
      await loading('Extracting strings...', unzipBuffer(zipBlob, path));
      success('Done!');
    } catch (e) {
      if (e instanceof HttpError && e.response.statusCode === 400) {
        const res: any = await e.response.body.json();
        error(
          `Please check if your parameters, including namespaces, are configured correctly. Tolgee responded with: ${res.code}`
        );
        return;
      }
      throw e;
    }
  };

export default (config: Schema) =>
  new Command()
    .name('pull')
    .description('Pulls translations to Tolgee')
    .argument(
      '[path]',
      'Destination path where translation files will be stored in',
      config.pull?.path
    )
    .addOption(
      new Option('-f, --format <format>', 'Format of the exported files')
        .choices(['JSON', 'XLIFF'])
        .default(config.format ?? 'JSON')
        .argParser((v) => v.toUpperCase())
    )
    .option(
      '-l, --languages <languages...>',
      'List of languages to pull. Leave unspecified to export them all'
    )
    .addOption(
      new Option(
        '-s, --states <states...>',
        'List of translation states to include. Defaults all except untranslated'
      )
        .default(config.pull?.languages)
        .choices(['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'])
        .argParser((v, a: string[]) => [v.toUpperCase(), ...(a || [])])
    )
    .addOption(
      new Option(
        '-d, --delimiter',
        'Structure delimiter to use. By default, Tolgee interprets `.` as a nested structure. You can change the delimiter, or disable structure formatting by not specifying any value to the option'
      )
        .default(config.delimiter ?? '.')
        .argParser((v) => v || '')
    )
    .addOption(
      new Option(
        '-n, --namespaces <namespaces...>',
        'List of namespaces to pull. Defaults to all namespaces'
      ).default(config.pull?.namespaces)
    )
    .option(
      '-o, --overwrite',
      'Whether to automatically overwrite existing files. BE CAREFUL, THIS WILL WIPE *ALL* THE CONTENTS OF THE TARGET FOLDER. If unspecified, the user will be prompted interactively, or the command will fail when in non-interactive'
    )
    .action(pullHandler());
