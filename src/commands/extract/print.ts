import type { BaseExtractOptions } from '../extract';
import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor';
import { WarningMessages } from '../../extractor/warnings';

type ExtractPrintOptions = BaseExtractOptions;

async function printHandler(this: Command, filesPattern: string) {
  const opts: ExtractPrintOptions = this.optsWithGlobals();
  const extracted = await extractKeysOfFiles(filesPattern, opts.extractor);

  let warningCount = 0;
  const keySet = new Set();
  for (const [file, { keys, warnings }] of extracted) {
    if (keys.length) {
      const relFile = relative(process.cwd(), file);
      console.log('%d keys found in %s:', keys.length, relFile);
      for (const key of keys) {
        keySet.add(key);
        console.log('\tline %d: %s', key.line, key.keyName);
        if (key.namespace) {
          console.log('\t\tnamespace: %s', key.namespace);
        }
        if (key.defaultValue) {
          console.log('\t\tdefault: %s', key.defaultValue);
        }
      }
    }

    if (warnings.length) {
      warningCount += warnings.length;
      console.log(
        '%d warnings were emitted during extraction:',
        warnings.length
      );
      for (const warning of warnings) {
        if (warning.warning in WarningMessages) {
          const { name } = WarningMessages[warning.warning];
          console.log('\tline %d: %s', warning.line, name);
        } else {
          console.log('\tline %d: %s', warning.line, warning.warning);
        }
      }
    }

    if (keys.length || warnings.length) {
      console.log();
    }
  }

  console.log('Total unique keys found: %d', keySet.size);
  console.log('Total warnings: %d', warningCount);
}

export default new Command('print')
  .description('Prints extracted data to the console')
  .argument('<pattern>', 'File pattern to include')
  .action(printHandler);
