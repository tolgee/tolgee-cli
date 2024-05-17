import type { BaseExtractOptions } from '../extract.js';
import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor/runner.js';
import {
  WarningMessages,
  emitGitHubWarning,
} from '../../extractor/warnings.js';
import { error, loading } from '../../utils/logger.js';
import { Schema } from '../../schema.js';

type ExtractLintOptions = BaseExtractOptions;

const lintHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: ExtractLintOptions = this.optsWithGlobals();
    const patterns = opts.patterns?.length ? opts.patterns : config.patterns;
    if (!patterns?.length) {
      error('Missing option --patterns or config.patterns option');
      process.exit(1);
    }
    const extracted = await loading(
      'Analyzing code...',
      extractKeysOfFiles(patterns, opts.extractor)
    );

    let warningCount = 0;
    let filesCount = 0;
    for (const [file, { warnings }] of extracted) {
      if (warnings.length) {
        warningCount += warnings.length;
        filesCount++;

        const relFile = relative(process.cwd(), file);
        console.log('%s:', relFile);
        for (const warning of warnings) {
          if (warning.warning in WarningMessages) {
            const { name } = WarningMessages[warning.warning];
            console.log('\tline %d: %s', warning.line, name);
          } else {
            console.log('\tline %d: %s', warning.line, warning.warning);
          }

          emitGitHubWarning(warning.warning, file, warning.line);
        }
      }
    }

    if (warningCount !== 0) {
      console.log();
      console.log(
        'Total: %d warning%s in %d file%s',
        warningCount,
        warningCount !== 1 ? 's' : '',
        filesCount,
        filesCount !== 1 ? 's' : ''
      );
      process.exit(1);
    }

    console.log('No issues found.');
  };

export default (config: Schema) =>
  new Command('check')
    .description(
      'Checks if the keys can be extracted automatically, and reports problems if any'
    )
    .action(lintHandler(config));
