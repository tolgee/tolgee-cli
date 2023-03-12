import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { SDKS } from '../constants';

export type ProjectSdk = (typeof SDKS)[number];

export type TolgeeConfig = {
  apiUrl?: URL;
  projectId?: number;
  sdk?: ProjectSdk;
  extractor?: string;
  delimiter?: string;
};

const explorer = cosmiconfig('tolgee', {
  loaders: {
    noExt: defaultLoaders['.json'],
  },
});

function parseConfig(rc: any): TolgeeConfig {
  if (typeof rc !== 'object' || Array.isArray(rc)) {
    throw new Error('Invalid config: config is not an object.');
  }

  const cfg: TolgeeConfig = {};
  if ('apiUrl' in rc) {
    if (typeof rc.apiUrl !== 'string') {
      throw new Error('Invalid config: apiUrl is not a string');
    }

    try {
      cfg.apiUrl = new URL(rc.apiUrl);
    } catch (e) {
      throw new Error('Invalid config: apiUrl is an invalid URL');
    }
  }

  if ('projectId' in rc) {
    const id = Number(rc.projectId);
    if (Number.isNaN(id)) {
      throw new Error('Invalid config: projectId is not a number');
    }

    cfg.projectId = rc.projectId;
  }

  if ('sdk' in rc) {
    if (!SDKS.includes(rc.sdk)) {
      throw new Error(
        `Invalid config: invalid sdk. Must be one of: ${SDKS.join(' ')}`
      );
    }

    cfg.sdk = rc.sdk;
  }

  if ('extractor' in rc) {
    if (typeof rc.extractor !== 'string') {
      throw new Error('Invalid config: extractor is not a string');
    }

    const extractorPath = resolve(rc.extractor);
    if (!existsSync(extractorPath)) {
      throw new Error(
        `Invalid config: extractor points to a file that does not exists (${extractorPath})`
      );
    }

    cfg.extractor = extractorPath;
  }

  if ('delimiter' in rc) {
    if (typeof rc.delimiter !== 'string' && rc.delimiter !== null) {
      throw new Error('Invalid config: delimiter is not a string');
    }

    cfg.delimiter = rc.delimiter || void 0;
  }

  return cfg;
}

export default async function loadTolgeeRc(): Promise<TolgeeConfig | null> {
  const res = await explorer.search();
  if (!res || res.isEmpty) return null;

  return parseConfig(res.config);
}
