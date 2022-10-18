import type { RequesterParams } from './internal/requester';
import type { components } from './internal/schema.generated';
import Requester from './internal/requester';

import LanguagesClient from './languages';
import ImportClient from './import';
import ExportClient from './export';

type ApiKeyInfo = components['schemas']['ApiKeyWithLanguagesModel'];

type _UserAccount = components['schemas']['UserAccountModel'];
type UserAccount = Omit<_UserAccount, 'deleted'> & {
  mfaEnabled: boolean;
  accountType: 'LOCAL' | 'LDAP' | 'THIRD_PARTY';
  deletable: boolean;
  needsSuperJwtToken: boolean;
};

export default class RestClient {
  private requester: Requester;
  readonly languages: LanguagesClient;
  readonly import: ImportClient;
  readonly export: ExportClient;

  constructor(params: RequesterParams) {
    this.requester = new Requester(params);

    this.languages = new LanguagesClient(this.requester);
    this.import = new ImportClient(this.requester);
    this.export = new ExportClient(this.requester);
  }

  async getApiKeyInformation(): Promise<ApiKeyInfo> {
    return this.requester.requestJson({
      path: '/v2/api-keys/current',
      method: 'GET',
    });
  }

  static getApiKeyInformation(api: URL, key: string): Promise<ApiKeyInfo> {
    return new Requester({ apiUrl: api, apiKey: key }).requestJson({
      path: '/v2/api-keys/current',
      method: 'GET',
    });
  }

  static getPersonalAccessTokenUser(
    api: URL,
    key: string
  ): Promise<UserAccount> {
    return new Requester({ apiUrl: api, apiKey: key }).requestJson({
      path: '/v2/user',
      method: 'GET',
    });
  }
}
