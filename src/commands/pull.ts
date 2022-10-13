import type { Blob } from 'buffer';
import { ZipFile, Options } from 'yauzl';
import type Client from '../client';

import { join, resolve } from 'path';
import { createWriteStream } from 'fs';
import { stat, rm, mkdir } from 'fs/promises';
import { fromBuffer as zipFromBufferCb } from 'yauzl';
import { Command, Option } from 'commander';

import { API_URL_OPT, API_KEY_OPT, PROJECT_ID_OPT } from '../options';
import { unzip } from '../utils/zip';
import { askBoolean } from '../utils/ask';
import { loading, success, warn, error } from '../utils/logger';

import { promisify } from 'util';
// Cast is required as TypeScript fails to properly type it
const zipFromBuffer = promisify(zipFromBufferCb) as (
  b: Buffer,
  opts?: Options
) => Promise<ZipFile>;

type PullParams = {
  apiUrl: URL;
  apiKey: string;
  projectId: number;
  client: Client;

  format: 'JSON' | 'XLIFF';
  languages?: string[];
  states?: Array<'UNTRANSLATED' | 'TRANSLATED' | 'REVIEWED'>;
  overwrite?: boolean;
};

async function validatePath(path: string, overwrite?: boolean) {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      error('The specified path already exists and is not a directory.');
      process.exit(1);
    }

    if (!overwrite) {
      if (!process.stdout.isTTY) {
        error('The specified path already exists.');
        process.exit(1);
      }

      warn(`The specified path ${resolve(path)} already exists.`);
      const userOverwrite = await askBoolean(
        'Do you want to overwrite data? *BE CAREFUL, ALL THE CONTENTS OF THE DESTINATION FOLDER WILL BE DESTROYED*.'
      );
      if (!userOverwrite) {
        error('Aborting.');
        process.exit(1);
      }

      // Purge data as requested.
      await rm(path, { recursive: true });
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

async function fetchZipBlob(params: PullParams): Promise<Blob> {
  return params.client.export.export({
    format: params.format,
    languages: params.languages,
    filterState: params.states,

    // these below as marked as required in the API types ¯\_(ツ)_/¯
    splitByScope: false,
    splitByScopeDelimiter: '',
    splitByScopeDepth: 0,
  });
}

async function extractZip(zipBlob: Blob, path: string) {
  const zipAb = await zipBlob.arrayBuffer();
  const opts = {
    strictFileNames: true,
    decodeStrings: true,
    lazyEntries: true,
  };

  const zip = await zipFromBuffer(Buffer.from(zipAb), opts);
  await unzip(zip, path);
}

async function pullHandler(path: string, params: PullParams) {
  await validatePath(path, params.overwrite);
  await mkdir(path, { recursive: true });

  const zipBlob = await loading(
    'Fetching strings from Tolgee...',
    fetchZipBlob(params)
  );

  await loading('Extracting strings...', extractZip(zipBlob, path));

  success('Done!');
}

export default new Command()
  .name('pull')
  .description('Pulls translations to Tolgee')
  .argument(
    '<path>',
    'Destination path where translation files will be stored in.'
  )
  .addOption(API_URL_OPT)
  .addOption(API_KEY_OPT)
  .addOption(PROJECT_ID_OPT)
  .addOption(
    new Option('-f, --format <format>', 'Format of the exported files.')
      .choices(['JSON', 'XLIFF'])
      .default('JSON')
      .argParser((v) => v.toUpperCase())
  )
  .option(
    '-l, --languages <languages...>',
    'List of languages to pull. Leave unspecified to export them all.'
  )
  .addOption(
    new Option(
      '-s, --states <states...>',
      'List of translation states to include. Defaults all except untranslated.'
    )
      .choices(['UNTRANSLATED', 'TRANSLATED', 'REVIEWED'])
      .argParser((v, a: string[]) => [v.toUpperCase(), ...(a || [])])
  )
  .option(
    '-o, --overwrite',
    'Whether to automatically overwrite existing files. BE CAREFUL, THIS WILL WIPE *ALL* THE CONTENTS OF THE TARGET FOLDER. If unspecified, the user will be prompted interactively, or the command will fail when in non-interactive.'
  )
  .action(pullHandler);
