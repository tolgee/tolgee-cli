import { stat } from 'fs/promises';
import { error } from './logger.js';

export async function checkPathNotAFile(path: string) {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      error('The specified path already exists and is not a directory.');
      process.exit(1);
    }
  } catch (e: any) {
    // Ignore "file doesn't exist" error
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}
