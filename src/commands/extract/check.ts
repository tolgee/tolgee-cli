import type { BaseExtractOptions } from '../extract.js';
import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor/runner.js';
import {
  WarningMessages,
  emitGitHubWarning,
} from '../../extractor/warnings.js';
import { loading } from '../../utils/logger.js';
import { FILE_PATTERNS } from '../../arguments.js';

type ExtractLintOptions = BaseExtractOptions;

async function lintHandler(this: Command, filesPatterns: string[]) {
  const opts: ExtractLintOptions = this.optsWithGlobals();
  const extracted = await loading(
    'Analyzing code...',
    extractKeysOfFiles(filesPatterns, opts.extractor)
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
}

export default new Command('check')
  .description(
    'Checks if the keys can be extracted automatically, and reports problems if any'
  )
  .addArgument(FILE_PATTERNS)
  .action(lintHandler);
