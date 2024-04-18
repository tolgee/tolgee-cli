import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { Validator } from 'jsonschema';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, resolve } from 'path';

import { CosmiconfigResult } from 'cosmiconfig/dist/types.js';
import { error } from '../utils/logger.js';
import { existsSync } from 'fs';

const explorer = cosmiconfig('tolgee', {
  loaders: {
    noExt: defaultLoaders['.json'],
  },
});

function parseConfig(input: any) {
  const rc = { ...input };
  if (typeof rc !== 'object' || Array.isArray(rc)) {
    throw new Error('Invalid config: config is not an object.');
  }

  if ('apiUrl' in rc) {
    try {
      new URL(rc.apiUrl);
    } catch (e) {
      throw new Error('Invalid config: apiUrl is an invalid URL');
    }
  }

  if ('projectId' in rc) {
    const projectId = Number(rc.projectId); // Number("") returns 0
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new Error(
        'Invalid config: projectId should be an integer representing your project Id'
      );
    }
  }

  if ('extractor' in rc) {
    const extractorPath = resolve(rc.extractor);
    if (!existsSync(extractorPath)) {
      throw new Error(
        `Invalid config: extractor points to a file that does not exists (${extractorPath})`
      );
    }
  }

  if ('delimiter' in rc) {
    rc.delimiter = rc.delimiter || '';
  }

  return rc;
}

async function getSchema() {
  const path = join(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
    '..',
    'schema.json'
  );

  return JSON.parse((await readFile(path)).toString());
}

export default async function loadTolgeeRc(path?: string): Promise<any | null> {
  let res: CosmiconfigResult;
  if (path) {
    try {
      res = await explorer.load(path);
    } catch (e: any) {
      error(e.message);
      throw new Error(`Can't open config file on path "${path}"`);
    }
  } else {
    res = await explorer.search();
  }

  if (!res || res.isEmpty) return null;

  const config = parseConfig(res.config);

  const validator = new Validator();
  const schema = await getSchema();
  const result = validator.validate(config, schema);

  if (result.errors.length) {
    const { message, property } = result.errors[0];
    const errMessage = `Tolgee config: '${property.replace(
      'instance.',
      ''
    )}' ${message}`;
    throw new Error(errMessage);
  }

  return config;
}
