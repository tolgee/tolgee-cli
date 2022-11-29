import { cosmiconfig, defaultLoaders } from 'cosmiconfig';

const SDKS = <const>['react'];

export type ProjectSdk = typeof SDKS[number];

export type TolgeeConfig = {
  apiUrl?: URL;
  projectId?: number;
  sdk?: ProjectSdk;
  extractor?: string;
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
    if (typeof rc.projectId !== 'number') {
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

    cfg.extractor = rc.extractor;
  } else {
    // Re-use the SDK config as a fallback
    cfg.extractor = cfg.sdk;
  }

  return cfg;
}

export default async function loadTolgeeRc(): Promise<TolgeeConfig | null> {
  const res = await explorer.search();
  if (!res || res.isEmpty) return null;

  return parseConfig(res.config);
}
