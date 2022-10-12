import type { File, AddFileResponse } from '../client/import';

import { join } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { Command, Option } from 'commander';

import { API_URL_OPT, API_KEY_OPT, PROJECT_ID_OPT } from '../options';
import ImportClient from '../client/import';
import { HttpError } from '../client/errors';
import { projectIdOfPak } from '../client/utils';

import { askString } from '../utils/ask';
import { loading, success, warn, error } from '../utils/logger';

type PushParams = {
  apiUrl: URL;
  apiKey: string;
  projectId: number;
  forceMode: 'KEEP' | 'OVERRIDE' | 'NO';
};

async function readDirectory(directory: string): Promise<File[]> {
  const files: File[] = [];

  const dir = await readdir(directory);
  for (const file of dir) {
    const filePath = join(directory, file);
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      const blob = await readFile(filePath);
      files.push({ name: file, data: blob });
    }
  }

  return files;
}

function getConflictingLanguages(result: AddFileResponse) {
  const conflicts = [];
  const languages = result.result?._embedded?.languages;
  if (languages) {
    for (const l of languages) {
      if (l.conflictCount) {
        conflicts.push(l.id);
      }
    }
  }

  return conflicts;
}

async function promptConflicts(
  params: PushParams
): Promise<'KEEP' | 'OVERRIDE'> {
  const projectId =
    params.projectId === -1
      ? await projectIdOfPak(params.apiUrl, params.apiKey)
      : params.projectId;

  const resolveUrl = new URL(`/projects/${projectId}/import`, params.apiUrl)
    .href;

  if (params.forceMode === 'NO') {
    error(
      `There are conflicts in the import. You can resolve them and complete the import here: ${resolveUrl}.`
    );
    process.exit(1);
  }

  if (params.forceMode) {
    return params.forceMode;
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

async function prepareImport(client: ImportClient, files: File[]) {
  return loading('Deleting import...', client.deleteImportIfExists()).then(() =>
    loading('Uploading files...', client.addFiles({ files: files }))
  );
}

async function resolveConflicts(
  client: ImportClient,
  locales: number[],
  method: 'KEEP' | 'OVERRIDE'
) {
  for (const locale of locales) {
    if (method === 'KEEP') {
      await client.conflictsKeepExistingAll(locale);
    } else {
      await client.conflictsOverrideAll(locale);
    }
  }
}

async function applyImport(client: ImportClient) {
  try {
    await loading('Applying changes...', client.applyImport());
  } catch (e) {
    if (e instanceof HttpError && e.response.status === 400) {
      error(
        "Some of the imported languages weren't recognized. Please create a language with corresponding tag in the Tolgee Platform."
      );
      return;
    }

    throw e;
  }
}

async function pushHandler(path: string, params: PushParams) {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      error('The specified path is not a directory.');
      process.exit(1);
    }
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      error('The specified path does not exist.');
      process.exit(1);
    }

    throw e;
  }

  const client = new ImportClient({
    apiUrl: params.apiUrl,
    apiKey: params.apiKey,
    projectId: params.projectId,
  });

  const files = await loading('Reading files...', readDirectory(path));
  if (files.length === 0) {
    error('Nothing to import.');
    return;
  }

  const result = await prepareImport(client, files);
  const conflicts = getConflictingLanguages(result);
  if (conflicts.length) {
    const resolveMethod = await promptConflicts(params);
    await loading(
      'Resolving conflicts...',
      resolveConflicts(client, conflicts, resolveMethod)
    );
  }

  await applyImport(client);
  success('Done!');
}

export default new Command()
  .name('push')
  .description('Pushes translations to Tolgee')
  .argument('<path>', 'Path to the files to push to Tolgee')
  .addOption(API_URL_OPT)
  .addOption(API_KEY_OPT)
  .addOption(PROJECT_ID_OPT)
  .addOption(
    new Option(
      '-f, --force-mode <mode>',
      'What should we do with possible conflicts? If unspecified, the user will be prompted interactively, or the command will fail when in non-interactive.'
    )
      .choices(['OVERRIDE', 'KEEP', 'NO'])
      .argParser((v) => v.toUpperCase())
  )
  .action(pushHandler);
