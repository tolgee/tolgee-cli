import { resolve } from 'path';
import { stat, rm, mkdir } from 'fs/promises';
import { askBoolean } from './ask.js';
import { warn, error } from './logger.js';

export async function overwriteDir(path: string, overwrite?: boolean) {
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

  // Create the directory
  await mkdir(path, { recursive: true });
}
