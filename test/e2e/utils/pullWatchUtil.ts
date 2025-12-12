import { existsSync } from 'fs';
import { TMP_FOLDER } from './tmp.js';
import { sleep } from './sleep.js';
import { TolgeeClient } from '#cli/client/TolgeeClient.js';

export class PullWatchUtil {
  constructor(private client: TolgeeClient) {}

  async waitFilesystemDataUpdated(aKeyValue: string) {
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      if (await this.isFilesystemDataUpdated(aKeyValue)) {
        return true;
      }
      await sleep(10);
      attempts++;
    }

    throw new Error('Timeout waiting for filesystem data to be updated');
  }

  async isFilesystemDataUpdated(newValue: string) {
    const fs = await import('fs/promises');
    const path = await import('path');

    if (!existsSync(TMP_FOLDER)) return false;

    try {
      const enJsonPath = path.join(TMP_FOLDER, 'en.json');
      const content = await fs.readFile(enJsonPath, 'utf-8');
      const data = JSON.parse(content);
      return data['controller'] === newValue;
    } catch (e) {
      console.debug(e);
      return false;
    }
  }

  async changeLocalizationData(newEnText: string) {
    await this.client.PUT('/v2/projects/{projectId}/translations', {
      params: {
        path: {
          projectId: this.client.getProjectId(),
        },
      },
      body: {
        key: 'controller',
        translations: { en: newEnText },
      },
    });
  }
}
