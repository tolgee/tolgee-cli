import { Fetcher } from "openapi-typescript-fetch";
import { paths } from "./generated/apiSchema.generated";
import { Configuration, ImportApi } from "./generated";
import fetch from "node-fetch";

export class Client {
  private fetcher = Fetcher.for<paths>();
  private importApi = new ImportApi(
    // xxx: unwanted any
    new Configuration({ fetchApi: fetch as any })
  );

  constructor(apiUrl: string, private apiKey: string) {
    this.fetcher.configure({
      baseUrl: apiUrl,
      init: {
        headers: {},
      },
      use: [this.errorHandler],
    });
  }

  async deleteImport() {
    return this.importApi
      .cancelImport1({ ak: this.apiKey })
      .catch(this.errorHandler);
  }

  async addFiles(files: any) {
    return this.importApi
      .addFiles1({ ak: this.apiKey, files: files })
      .catch(this.errorHandler);
  }

  async applyImport() {
    return this.importApi
      .applyImport1({ ak: this.apiKey })
      .catch(this.errorHandler);
  }

  private errorHandler = async (e: any) => {
    if (e.status == 404) {
      throw new NotFoundError(await e.json());
    }
    if (e.status == 400) {
      throw new BadRequestError(await e.json());
    }
    if (e.status == 403) {
      throw new UnauthorizedError();
    }
    if (e.status > 400) {
      throw new UnknownError();
    }
    throw e;
  };
}

export class NotFoundError extends Error {
  constructor(public data: { code: string; params: any[] }) {
    super("Not Found");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnknownError extends Error {
  constructor() {
    super("Unknown Error");
    Object.setPrototypeOf(this, UnknownError.prototype);
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class BadRequestError extends Error {
  constructor(public data: { code: string; params: any[] }) {
    super("Bad request");
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
