import {Fetcher} from "openapi-typescript-fetch";
import {paths} from "./generated/apiSchema.generated";
import {ExportApi, ImportApi, LanguagesApi, ResponseError} from "./generated";

export class Client {

  private fetcher = Fetcher.for<paths>()
  private importApi = new ImportApi()
  private exportApi = new ExportApi()
  private languagesApi = new LanguagesApi()

  constructor(apiUrl: string, private apiKey: string) {
    this.fetcher.configure({
      baseUrl: apiUrl,
      init: {
        headers: {}
      },
      use: [this.errorHandler]
    })
  }

  async deleteImport() {
    return this.importApi.cancelImport1({xAPIKey: this.apiKey}).catch(this.errorHandler)
  }

  async addFiles(files: any) {
    return this.importApi.addFiles1({xAPIKey: this.apiKey, files: files}).catch(this.errorHandler)
  }

  async applyImport() {
    return this.importApi.applyImport1({xAPIKey: this.apiKey}).catch(this.errorHandler)
  }

  async getAllKeys() {
    const tag = await this.getAnyLanguage();
    if (!tag) {
      throw Error('No language found.')
    }
    try {
      const response = await this.exportApi.exportPost1({
        xAPIKey: this.apiKey,
        // @ts-ignore
        exportParams: {
          filterState: ['REVIEWED', 'TRANSLATED', 'UNTRANSLATED'],
          // @ts-ignore
          languages: [tag],
          splitByScopeDelimiter: "",
          zip: false
        }
      },)
      return Object.keys(response);
    } catch (e) {
      console.error(await (e as ResponseError).response.json())
      throw e;
    }
  }

  async getAnyLanguage() {
    const result = await this.languagesApi.getAll6({xAPIKey: this.apiKey, size: 1})
    return result.embedded?.languages?.[0]?.tag
  }

  private errorHandler = async (e: any) => {
    if (e.status == 404) {
      throw new NotFoundError(await e.json())
    }
    if (e.status == 400) {
      throw new BadRequestError(await e.json())
    }
    if (e.status == 403) {
      throw new UnauthorizedError()
    }
    if (e.status > 400) {
      throw new UnknownError()
    }
    throw e
  }
}

export class NotFoundError extends Error {
  constructor(public data: { code: string, params: any[] }) {
    super("Not Found")
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
  constructor(public data: { code: string, params: any[] }) {
    super("Bad request")
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
