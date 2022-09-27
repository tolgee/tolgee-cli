import { Command } from 'commander';
import { Import } from './import';

const program = new Command('tolgee-cli');

program.description('Command Line Interface to interact with Tolgee');

program
  .command('import')
  .description('Imports data from Tolgee')
  .option('-i, --input <inputPath>', 'Directory or single file to import', '.')
  .option('-ak, --apiKey <apiKey>')
  .option(
    '-au, --apiUrl <apiUrl>',
    'The url of Tolgee API',
    'https://app.tolgee.io'
  )
  .option(
    '-f, --forceMode <OVERRIDE | KEEP | NO>',
    'What should we do with possible conflicts?',
    'NO_FORCE'
  )
  .action(async (options) => {
    await new Import({
      apiUrl: options.apiUrl,
      apiKey: options.apiKey,
      inputPath: options.input,
      forceMode: options.forceMode,
    }).execute();
  });

program.parse();

process.stdout.write('\n\n');
