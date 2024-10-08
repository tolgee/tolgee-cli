import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor/runner.js';
import {
  WarningMessages,
  emitGitHubWarning,
} from '../../extractor/warnings.js';
import { loading } from '../../utils/logger.js';
import { Schema } from '../../schema.js';
import type { BaseOptions } from '../../options.js';

type ExtractLintOptions = BaseOptions;

const lintHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: ExtractLintOptions = this.optsWithGlobals();
    const extracted = await loading(
      'Analyzing code...',
      extractKeysOfFiles(opts)
    );

    let warningCount = 0;
    let filesCount = 0;
    for (const [file, { warnings }] of extracted) {
      if (warnings?.length) {
        warningCount += warnings.length;
        filesCount++;

        const relFile = relative(process.cwd(), file);
        console.log('%s:', relFile);
        for (const warning of warnings) {
          if (warning.warning in WarningMessages) {
            const warn = warning.warning as keyof typeof WarningMessages;
            const { name } = WarningMessages[warn];
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
