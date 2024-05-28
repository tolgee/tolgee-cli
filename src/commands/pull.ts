import { Blob } from 'buffer';
import type { BaseOptions } from '../options.js';

import { Command, Option } from 'commander';

import { unzipBuffer } from '../utils/zip.js';
import { prepareDir } from '../utils/prepareDir.js';
import { loading, success } from '../utils/logger.js';
import { Schema } from '../schema.js';
import { checkPathNotAFile } from '../utils/checkPathNotAFile.js';
import { mapExportFormat } from '../utils/mapExportFormat.js';
import { handleLoadableError } from '../client/TolgeeClient.js';

type PullOptions = BaseOptions & {
  format: Schema['format'];
  languages?: string[];
  states?: Array<'UNTRANSLATED' | 'TRANSLATED' | 'REVIEWED'>;
  delimiter?: string;
  emptyDir?: boolean;
  namespaces?: string[];
  tags?: string[];
  supportArrays: boolean;
  excludeTags?: string[];
  fileStructureTemplate?: string;
  path?: string;
};

async function fetchZipBlob(opts: PullOptions): Promise<Blob> {
  const exportFormat = mapExportFormat(opts.format);
  const { format, messageFormat } = exportFormat;
  const loadable = await opts.client.export.export({
    format,
    messageFormat,
    supportArrays: opts.supportArrays,
    languages: opts.languages,
    filterState: opts.states,
    structureDelimiter: opts.delimiter,
    filterNamespace: opts.namespaces,
    filterTagIn: opts.tags,
    filterTagNotIn: opts.excludeTags,
    fileStructureTemplate: opts.fileStructureTemplate,
  });

  handleLoadableError(loadable);
  return loadable.data;
}

const pullHandler = () =>
  async function (this: Command) {
    const opts: PullOptions = this.optsWithGlobals();

    if (!opts.path) {
      throw new Error('Missing or option --path <path>');
    }

    await checkPathNotAFile(opts.path);

    const zipBlob = await loading(
      'Fetching strings from Tolgee...',
      fetchZipBlob(opts)
    );
    await prepareDir(opts.path, opts.emptyDir);
    await loading('Extracting strings...', unzipBuffer(zipBlob, opts.path));
    success('Done!');
  };

export default (config: Schema) =>
  new Command()
    .name('pull')
    .description('Pulls translations to Tolgee')
    .addOption(
      new Option(
        '-p, --path <path>',
        'Destination of a folder where translation files will be stored in'
      ).default(config.pull?.path)
    )
    .addOption(
      new Option(
        '-l, --languages <languages...>',
        'List of languages to pull. Leave unspecified to export them all'
      ).default(config.pull?.languagess)
    )
    .addOption(
      new Option(
        '-s, --states <states...>',
        'List of translation states to include. Defaults all except untranslated'
      )
        .choices(['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'])
        .default(config.pull?.states)
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
    .addOption(
      new Option(
        '-t, --tags <tags...>',
        'List of tags which to include.'
      ).default(config.pull?.tags)
    )
    .addOption(
      new Option(
        '--exclude-tags <tags...>',
        'List of tags which to exclude.'
      ).default(config.pull?.excludeTags)
    )
    .addOption(
      new Option(
        '--support-arrays',
        'Export keys with array syntax (e.g. item[0]) as arrays.'
      ).default(config.pull?.supportArrays ?? false)
    )
    .addOption(
      new Option(
        '--empty-dir',
        'Empty [path] directory before inserting pulled files.'
      ).default(config.pull?.emptyDir)
    )
    .addOption(
      new Option(
        '--file-structure-template <template>',
        'This is a template that defines the structure of the resulting .zip file content.\n\n' +
          'The template is a string that can contain the following placeholders: {namespace}, {languageTag}, {androidLanguageTag}, {snakeLanguageTag}, {extension}.\n\n' +
          'For example, when exporting to JSON with the template {namespace}/{languageTag}.{extension}, the English translations of the home namespace will be stored in home/en.json.\n\n' +
          'The {snakeLanguageTag} placeholder is the same as {languageTag} but in snake case. (e.g., en_US).\n\n' +
          'The Android specific {androidLanguageTag} placeholder is the same as {languageTag} but in Android format. (e.g., en-rUS)'
      ).default(config.pull?.fileStructureTemplate)
    )
    .action(pullHandler());
