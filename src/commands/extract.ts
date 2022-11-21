import { Command } from 'commander';

import extractPrint from './extract/print'
import extractCheck from './extract/check'

export type BaseExtractOptions = {
  extractor: string;
};

export default new Command('extract')
  .requiredOption(
    '-e, --extractor <extractor>',
    'The extractor to use. Either a builtin identifier, or a path to a JS (or TS) file.'
  )
  .addCommand(extractPrint)
  .addCommand(extractCheck);
