import type { RequesterParams } from './internal/requester.js';
import type { components } from './internal/schema.generated.js';

import base32Decode from 'base32-decode';
import Requester from './internal/requester.js';

import ProjectClient from './project.js';
import LanguagesClient from './languages.js';
import ImportClient from './import.js';
import ExportClient from './export.js';

import { API_KEY_PAK_PREFIX } from '../constants.js';

type ProjectApiKeyInfo = components['schemas']['ApiKeyWithLanguagesModel'];

type PatWithUser = components['schemas']['PatWithUserModel'];

export type ApiKeyInfoPat = {
  type: 'PAT';
  key: string;
  username: string;
  expires: number;
};

export type ApiKeyInfoPak = {
  type: 'PAK';
  key: string;
  username: string;
  project: { id: number; name: string };
  expires: number;
};

export type ApiKeyInfo = ApiKeyInfoPat | ApiKeyInfoPak;

export default class RestClient {
  private requester: Requester;
  readonly project: ProjectClient;
  readonly languages: LanguagesClient;
  readonly import: ImportClient;
  readonly export: ExportClient;

  constructor(private params: RequesterParams) {
    this.requester = new Requester(params);

    this.project = new ProjectClient(this.requester);
    this.languages = new LanguagesClient(this.requester);
    this.import = new ImportClient(this.requester);
    this.export = new ExportClient(this.requester);
  }

  async getProjectApiKeyInformation(): Promise<ProjectApiKeyInfo> {
    return this.requester.requestJson({
      path: '/v2/api-keys/current',
      method: 'GET',
    });
  }

  getProjectId() {
    return this.params.projectId;
  }

  static projectIdFromKey(key: string) {
    const keyBuffer = base32Decode(
      key.slice(API_KEY_PAK_PREFIX.length).toUpperCase(),
      'RFC4648'
    );

    const decoded = Buffer.from(keyBuffer).toString('utf8');
    return Number(decoded.split('_')[0]);
  }

  static getProjectApiKeyInformation(
    api: URL,
    key: string
  ): Promise<ProjectApiKeyInfo> {
    return new Requester({ apiUrl: api, apiKey: key }).requestJson({
      path: '/v2/api-keys/current',
      method: 'GET',
    });
  }

  static getPersonalAccessTokenInformation(
    api: URL,
    key: string
  ): Promise<PatWithUser> {
    return new Requester({ apiUrl: api, apiKey: key }).requestJson({
      path: '/v2/pats/current',
      method: 'GET',
    });
  }

  static async getApiKeyInformation(
    api: URL,
    key: string
  ): Promise<ApiKeyInfo> {
    if (key.startsWith(API_KEY_PAK_PREFIX)) {
      const info = await RestClient.getProjectApiKeyInformation(api, key);
      const username = info.userFullName || info.username || '<unknown user>';

      return {
        type: 'PAK',
        key: key,
        username: username,
        project: {
          id: info.projectId,
          name: info.projectName,
        },
        expires: info.expiresAt ?? 0,
      };
    }

    const info = await RestClient.getPersonalAccessTokenInformation(api, key);
    const username = info.user.name || info.user.username;

    return {
      type: 'PAT',
      key: key,
      username: username,
      expires: info.expiresAt ?? 0,
    };
  }
}
