import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { Schema } from '#cli/schema.js';

export let TMP_FOLDER: string;

export function setupTemporaryFolder() {
  beforeEach(() => {
    TMP_FOLDER = join(tmpdir(), randomUUID());
  });

  afterEach(async () => {
    try {
      await rm(TMP_FOLDER, { recursive: true });
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  });
}

export let TMP_TOLGEE_FOLDER: string | undefined;

export async function createTmpFolderWithConfig(config: Schema) {
  const tempFolder = await mkdtemp(join(tmpdir(), 'cli-project-'));
  const configFile = join(tempFolder, '.tolgeerc.json');
  await writeFile(configFile, JSON.stringify(config, null, 2));
  TMP_TOLGEE_FOLDER = tempFolder;
  return { tempFolder, configFile };
}

export async function removeTmpFolder() {
  if (TMP_TOLGEE_FOLDER) {
    await rm(TMP_TOLGEE_FOLDER, { recursive: true });
    TMP_TOLGEE_FOLDER = undefined;
  }
}
