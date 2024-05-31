import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';

export async function prepareDir(path: string, emptyDir?: boolean) {
  const exists = existsSync(path);

  if (emptyDir && exists) {
    await rm(path, { recursive: true });
  }

  if (!exists || emptyDir) {
    // Create the directory
    await mkdir(path, { recursive: true });
  }
}
