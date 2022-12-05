import type { BaseExtractOptions } from '../extract';
import { relative } from 'path';
import { Command } from 'commander';

import { extractKeysOfFiles } from '../../extractor';
import { WarningMessages, emitGitHubWarning } from '../../extractor/warnings';

type ExtractLintOptions = BaseExtractOptions;

async function lintHandler(this: Command, filesPattern: string) {
  const opts: ExtractLintOptions = this.optsWithGlobals();
  const extracted = await extractKeysOfFiles(filesPattern, opts.extractor);

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
      'Total: %d warning%s in %d file%d',
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
    'Checks if the keys can be extracted automatically, and reports problems if any.'
  )
  .argument('<pattern>', 'File pattern to include')
  .action(lintHandler);
