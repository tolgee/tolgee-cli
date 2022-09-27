import type { AddFileResponse } from './client/import';
import { promises as fs } from 'fs';
import path from 'path';
import { error, loading } from './logger';

import { HttpError } from './client/errors';
import ImportClient from './client/import';

type ImportParams = {
  apiUrl: string;
  apiKey: string;
  inputPath: string;
  forceMode: 'KEEP' | 'OVERRIDE' | 'NO';
};

export class Import {
  private client: ImportClient;

  constructor(private args: ImportParams) {
    this.client = new ImportClient({
      apiUrl: args.apiUrl,
      apiKey: args.apiKey,
    });
  }

  async execute() {
    const inputPath = path.resolve(this.args.inputPath);

    const stats = await fs.lstat(inputPath);

    if (stats.isDirectory()) {
      await this.importDirectory();
    }
  }

  async getFiles() {
    const dir = await fs.readdir(this.args.inputPath);
    return Promise.all(
      dir.map((item) => {
        const filePath = path.resolve(`${this.args.inputPath}/${item}`);
        return fs.readFile(filePath).then((b) => ({ name: item, data: b }));
      })
    );
  }

  async importDirectory() {
    const files = await loading('Reading files...', this.getFiles());

    await loading('Deleting import', this.client.deleteImportIfExists());

    try {
      const result = await loading(
        'Uploading files...',
        this.client.addFiles({ files: files })
      );
      const isConflicts = this.checkForConflicts(result);

      if (isConflicts) {
        error(
          "There are conflicts. Resolve them in the browser or set --forceMode option to 'KEEP' or 'OVERRIDE'"
        );
        return;
      }

      await loading('Applying changes...', this.client.applyImport());
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

  private checkForConflicts(result: AddFileResponse) {
    let isConflicts: boolean = false;
    if (this.args.forceMode === 'NO') {
      result.result?._embedded?.languages?.forEach((l) => {
        if (l.conflictCount > 0) {
          isConflicts = true;
        }
      });
    }
    return isConflicts;
  }
}
