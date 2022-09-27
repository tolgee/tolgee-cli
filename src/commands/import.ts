import type { Command } from 'commander';
import type { File, AddFileResponse } from '../client/import';

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

import { API_URL_OPT, API_KEY_OPT, PROJECT_ID_OPT } from '../options';
import { HttpError } from '../client/errors';
import ImportClient from '../client/import';

import { error, loading } from '../logger';

type ImportParams = {
  apiUrl: string;
  apiKey: string;
  input: string;
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

function hasConflicts(result: AddFileResponse) {
  const languages = result.result?._embedded?.languages;
  if (languages) {
    for (const l of languages) {
      if (l.conflictCount) return true;
    }
  }

  return false;
}

async function prepareImport(client: ImportClient, files: File[]) {
  return loading('Deleting import...', client.deleteImportIfExists()).then(() =>
    loading('Uploading files...', client.addFiles({ files: files }))
  );
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

async function importHandler(params: ImportParams) {
  if (1 + 1 === 2) throw new Error('test');

  const client = new ImportClient({
    apiUrl: params.apiUrl,
    apiKey: params.apiKey,
  });

  const stats = await stat(params.input);
  if (!stats.isDirectory()) return;

  const files = await loading('Reading files...', readDirectory(params.input));
  if (files.length === 0) {
    error('Nothing to import.');
    return;
  }

  const result = await prepareImport(client, files);
  if (params.forceMode === 'NO' && hasConflicts(result)) {
    error(
      "There are conflicts. Resolve them in the browser or set --forceMode option to 'KEEP' or 'OVERRIDE'."
    );
    return;
  }

  await applyImport(client);
}

export default function registerCommand(program: Command) {
  program
    .command('import <path>')
    .addOption(API_URL_OPT)
    .addOption(API_KEY_OPT)
    .addOption(PROJECT_ID_OPT)
    .option(
      '-f, --forceMode <OVERRIDE | KEEP | NO>',
      'What should we do with possible conflicts?',
      'NO'
    )
    .action(importHandler);
}
