import type Client from '../client';
import { Command, Option } from 'commander';

import extractKeys from '../extractor';
import { API_URL_OPT, API_KEY_OPT, PROJECT_ID_OPT } from '../options';

type BaseExtractOptions = {
  preset: 'react';
  customExtractor?: string;
};

type ExtractPrintOptions = BaseExtractOptions;

type ExtractCompareOptions = BaseExtractOptions & {
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

async function printHandler(this: Command, filesPattern: string) {
  const opts: ExtractPrintOptions = this.optsWithGlobals();
  const keys = await extractKeys(filesPattern, opts);

  for (const key of keys.keys) console.log(key);
  console.log(`Found: ${keys.keys.length} keys.`);
}

async function compareHandler(this: Command, filesPattern: string) {
  const opts: ExtractCompareOptions = this.optsWithGlobals();

  // todo: migrate to a better endpoint combo once it exists
  const platformKeys = await fetchAllKeys(opts.client);
  const keys = await extractKeys(filesPattern, opts);

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

const extractPrint = new Command('print')
  .description('Prints extracted data to the console')
  .argument('<pattern>', 'File pattern to include')
  .action(printHandler);

const extractCompare = new Command('compare')
  .addOption(API_URL_OPT)
  .addOption(API_KEY_OPT)
  .addOption(PROJECT_ID_OPT)
  .option('-c, --custom-extractor <js file>', 'JS file with custom extractor')
  .argument('<pattern>', 'File pattern to include')
  .action(compareHandler);

export default new Command('extract')
  .option('-c, --custom-extractor <js file>', 'JS file with custom extractor')
  .addOption(
    new Option('-p, --preset <preset>', 'The preset to use')
      .choices(['react'])
      .default('react')
  )
  .addCommand(extractPrint)
  .addCommand(extractCompare);
