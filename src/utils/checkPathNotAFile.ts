import { stat } from 'fs/promises';
import { exitWithError } from './logger.js';

export async function checkPathNotAFile(path: string) {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      exitWithError(
        'The specified path already exists and is not a directory.'
      );
    }
  } catch (e: any) {
    // Ignore "file doesn't exist" error
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}
