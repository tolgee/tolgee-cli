import type { Blob } from 'buffer';
import type { BaseOptions } from '../options.js';

import { Command, Option } from 'commander';

import { unzipBuffer } from '../utils/zip.js';
import { overwriteDir } from '../utils/overwriteDir.js';
import { loading, success } from '../utils/logger.js';

type PullOptions = BaseOptions & {
  format: 'JSON' | 'XLIFF';
  languages?: string[];
  states?: Array<'UNTRANSLATED' | 'TRANSLATED' | 'REVIEWED'>;
  delimiter?: string;
  overwrite?: boolean;
};

async function fetchZipBlob(opts: PullOptions): Promise<Blob> {
  return opts.client.export.export({
    format: opts.format,
    languages: opts.languages,
    filterState: opts.states,
    structureDelimiter: opts.delimiter,
    filterNamespace: opts.namespace,
  });
}

async function pullHandler(this: Command, path: string) {
  const opts: PullOptions = this.optsWithGlobals();

  await overwriteDir(path, opts.overwrite);

  const zipBlob = await loading(
    'Fetching strings from Tolgee...',
    fetchZipBlob(opts)
  );

  await loading('Extracting strings...', unzipBuffer(zipBlob, path));
  success('Done!');
}

export default new Command()
  .name('pull')
  .description('Pulls translations to Tolgee')
  .argument(
    '<path>',
    'Destination path where translation files will be stored in'
  )

  .addOption(
    new Option('-f, --format <format>', 'Format of the exported files')
      .choices(['JSON', 'XLIFF'])
      .default('JSON')
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
      .choices(['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'])
      .argParser((v, a: string[]) => [v.toUpperCase(), ...(a || [])])
  )
  .addOption(
    new Option(
      '-d, --delimiter',
      'Structure delimiter to use. By default, Tolgee interprets `.` as a nested structure. You can change the delimiter, or disable structure formatting by not specifying any value to the option'
    )
      .default('.')
      .argParser((v) => v || '')
  )
  .addOption(
    new Option(
      '-n, --namespace <namespace...>',
      'Namespace, pull keys from specified namespaces. Defaults all namespaces'
    ).argParser((v, a: string[]) => [v, ...(a || [])])
  )
  .option(
    '-o, --overwrite',
    'Whether to automatically overwrite existing files. BE CAREFUL, THIS WILL WIPE *ALL* THE CONTENTS OF THE TARGET FOLDER. If unspecified, the user will be prompted interactively, or the command will fail when in non-interactive'
  )
  .action(pullHandler);
