import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { Validator } from 'jsonschema';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

import { CosmiconfigResult } from 'cosmiconfig/dist/types.js';
import { error, exitWithError } from '../utils/logger.js';
import { existsSync } from 'fs';
import { Schema } from '../schema.js';

const explorer = cosmiconfig('tolgee', {
  loaders: {
    noExt: defaultLoaders['.json'],
  },
});

function parseConfig(input: Schema, configDir: string): Schema {
  const rc = { ...input };

  if (rc.apiUrl !== undefined) {
    try {
      new URL(rc.apiUrl);
    } catch (e) {
      throw new Error('Invalid config: apiUrl is an invalid URL');
    }
  }

  if (rc.projectId !== undefined) {
    const projectId = Number(rc.projectId); // Number("") returns 0
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new Error(
        'Invalid config: projectId should be an integer representing your project Id'
      );
    }
  }

  if (rc.extractor !== undefined) {
    rc.extractor = resolve(configDir, rc.extractor);
    if (!existsSync(rc.extractor)) {
      throw new Error(
        `Invalid config: extractor points to a file that does not exists (${rc.extractor})`
      );
    }
  }

  if (rc.delimiter !== undefined) {
    rc.delimiter = rc.delimiter || '';
  }

  // convert relative paths in config to absolute
  // so it's always relative to config location

  if (rc.push?.files) {
    rc.push.files = rc.push.files.map((r) => ({
      ...r,
      path: resolve(configDir, r.path),
    }));
  }

  if (rc.pull?.path !== undefined) {
    rc.pull.path = resolve(configDir, rc.pull.path);
  }

  if (rc.patterns !== undefined) {
    rc.patterns = rc.patterns.map((pattern: string) =>
      resolve(configDir, pattern)
    );
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

export default async function loadTolgeeRc(
  path?: string
): Promise<Schema | null> {
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

  const config = parseConfig(res.config, dirname(path || '.'));

  const validator = new Validator();
  const schema = await getSchema();
  const result = validator.validate(config, schema);

  if (result.errors.length) {
    const { message, property } = result.errors[0];
    const errMessage = `Tolgee config: '${property.replace(
      'instance.',
      ''
    )}' ${message}`;
    exitWithError(errMessage);
  }

  return config;
}
