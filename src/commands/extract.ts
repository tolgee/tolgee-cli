import type Client from '../client';
import { readFile } from 'fs/promises';
import { Command, Option } from 'commander';

import extractKeys from '../extractor';
import { API_URL_OPT, API_KEY_OPT, PROJECT_ID_OPT } from '../options';

import { debug } from '../utils/logger';
import { KEY_REGEX } from '../utils/constants';

type BaseExtractParams = {
  preset: 'react';
  customExtractor?: string;
};

type ExtractPrintParams = BaseExtractParams;

type ExtractCompareParams = BaseExtractParams & {
  apiUrl: URL;
  apiKey: string;
  projectId: number;
  client: Client;
};

export type PossibleKey = {
  fileName: string;
  line: number;
  position: number;
};

async function printHandler(filesPattern: string, params: ExtractPrintParams) {
  const keys = await extractKeys(filesPattern, params);

  for (const key of keys.keys) console.log(key);
  console.log(`Found: ${keys.keys.length} keys.`);
}

async function fetchAllKeys(client: Client) {
  const languages = await client.languages.getLanguages({ size: 1 });
  const lang = languages.data?.languages?.[0]?.tag!;

  const exported = await client.export.exportSingle({
    format: 'JSON',
    languages: [lang],
    splitByScope: false,
    splitByScopeDelimiter: '',
    splitByScopeDepth: 0,
  });

  return Object.keys(exported);
}

async function compareHandler(
  filesPattern: string,
  params: ExtractCompareParams
) {
  // todo: migrate to a better endpoint combo once it exists
  const platformKeys = await fetchAllKeys(params.client);
  const keys = await extractKeys(filesPattern, params);

  const localKeysNotInPlatform = [...keys.keys];
  platformKeys.forEach((platformKey) => {
    const idx = localKeysNotInPlatform.indexOf(platformKey);
    if (idx > -1) {
      localKeysNotInPlatform.splice(idx, 1);
    }
  });

  const unusedPlatformKeys = [...platformKeys];
  keys.keys.forEach((localKey) => {
    const idx = unusedPlatformKeys.indexOf(localKey);
    if (idx > -1) {
      unusedPlatformKeys.splice(idx, 1);
    }
  });

  const unusedPlatformKeysWithPossibleKeys: Record<string, PossibleKey[]> = {};
  unusedPlatformKeys.forEach((key) => {
    unusedPlatformKeysWithPossibleKeys[key] = keys.possibleKeys.get(key) || [];
  });

  console.log('\nThese local keys were not found in platform:\n');
  localKeysNotInPlatform.forEach((key) => {
    console.log(key);
  });

  console.log('\nThese keys from platform were not found locally:\n');
  Object.entries(unusedPlatformKeysWithPossibleKeys).forEach(
    ([key, occurrences]) => {
      console.log(key);
      occurrences.forEach((occurrence) => {
        console.log(
          `    ${occurrence.fileName}:${occurrence.line}:${occurrence.position}`
        );
      });
    }
  );
}

const presetOpt = new Option('-p, --preset <preset>', 'The preset to use')
  .choices(['react'])
  .default('react');

const extractPrint = new Command('print')
  .description('Prints extracted data to the console')
  .addOption(presetOpt)
  .option('-c, --custom-extractor <js file>', 'JS file with custom extractor')
  .argument('<pattern>', 'File pattern to include')
  .action(printHandler);

const extractCompare = new Command('compare')
  .addOption(API_URL_OPT)
  .addOption(API_KEY_OPT)
  .addOption(PROJECT_ID_OPT)
  .addOption(presetOpt)
  .option('-c, --custom-extractor <js file>', 'JS file with custom extractor')
  .argument('<pattern>', 'File pattern to include')
  .action(compareHandler);

export default new Command('extract')
  .addCommand(extractPrint)
  .addCommand(extractCompare);

export type {
  Extractor,
  ExtractorFunction,
  ExtractorRegExp,
} from '../extractor';
