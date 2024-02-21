import type { BaseExtractOptions } from '../extract.js';
import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor/runner.js';
import { WarningMessages } from '../../extractor/warnings.js';
import { loading } from '../../utils/logger.js';
import { FILE_PATTERNS } from '../../arguments.js';

type ExtractPrintOptions = BaseExtractOptions;

async function printHandler(this: Command, filesPatterns: string[]) {
  const opts: ExtractPrintOptions = this.optsWithGlobals();
  const extracted = await loading(
    'Analyzing code...',
    extractKeysOfFiles(filesPatterns, opts.extractor)
  );

  let warningCount = 0;
  const keySet = new Set();
  for (const [file, { keys, warnings }] of extracted) {
    if (keys.length) {
      const relFile = relative(process.cwd(), file);
      console.log(
        '%d key%s found in %s:',
        keys.length,
        keys.length !== 1 ? 's' : '',
        relFile
      );
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
        '%d warning%s %s emitted during extraction:',
        warnings.length,
        warnings.length !== 1 ? 's' : '',
        warnings.length !== 1 ? 'were' : 'was'
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
  .addArgument(FILE_PATTERNS)
  .action(printHandler);
