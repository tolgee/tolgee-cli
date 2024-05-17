import type { BaseExtractOptions } from '../extract.js';
import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor/runner.js';
import { WarningMessages } from '../../extractor/warnings.js';
import { error, loading } from '../../utils/logger.js';
import { Schema } from '../../schema.js';

type ExtractPrintOptions = BaseExtractOptions;

const printHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: ExtractPrintOptions = this.optsWithGlobals();

    const patterns = opts.patterns?.length ? opts.patterns : config.patterns;
    if (!patterns?.length) {
      error('Missing argument <patterns>');
      process.exit(1);
    }

    const extracted = await loading(
      'Analyzing code...',
      extractKeysOfFiles(patterns, opts.extractor)
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
  };

export default (config: Schema) =>
  new Command('print')
    .description('Prints extracted data to the console')
    .action(printHandler(config));
