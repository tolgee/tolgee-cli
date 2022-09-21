import { createReadStream, promises as fs } from "fs";
import path from "path";
import { BadRequestError, Client, NotFoundError } from "./Client";
import { error, loading } from "./logger";
import { ImportAddFilesResultModel } from "./generated";

export class Import {
  private client: Client;

  constructor(
    private args: {
      apiUrl: string;
      apiKey: string;
      inputPath: string;
      forceMode: "KEEP" | "OVERRIDE" | "NO";
    }
  ) {
    this.client = new Client(args.apiUrl, args.apiKey);
  }

  async execute() {
    const inputPath = path.resolve(this.args.inputPath);

    const stats = await fs.lstat(inputPath);

    if (stats.isDirectory()) {
      await this.importDirectory();
    }
  }

  async deleteImportIfExists() {
    try {
      await loading("Deleting import", this.client.deleteImport());
    } catch (e) {
      if (e instanceof NotFoundError) {
        return;
      }
      throw e;
    }
  }

  async getFiles() {
    const dir = await fs.readdir(this.args.inputPath);
    return dir.map((item) => {
      const filePath = path.resolve(`${this.args.inputPath}/${item}`);
      return createReadStream(filePath);
    });
  }

  async importDirectory() {
    const files = await loading("Reading files...", this.getFiles());

    await this.deleteImportIfExists();

    try {
      const result = await loading(
        "Uploading files...",
        this.client.addFiles(files)
      );
      const isConflicts = this.checkForConflicts(result);

      if (isConflicts) {
        error(
          "There are conflicts. Resolve them in the browser or set --forceMode option to 'KEEP' or 'OVERRIDE'"
        );
        return;
      }

      await loading("Applying changes...", this.client.applyImport());
    } catch (e) {
      if (e instanceof BadRequestError) {
        error(
          "Some of the imported languages wasn't recongnozed. Please create a language with corresponding tag in the Tolgee Platform."
        );
        return;
      }
      throw e;
    }
  }

  private checkForConflicts(result: ImportAddFilesResultModel) {
    let isConflicts: boolean = false;
    if (this.args.forceMode === "NO") {
      result.result?.embedded?.languages?.forEach((l) => {
        if (l.conflictCount > 0) {
          isConflicts = true;
        }
      });
    }
    return isConflicts;
  }
}
