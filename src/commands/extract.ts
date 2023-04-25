import { Command } from 'commander';

import extractPrint from './extract/print.js';
import extractCheck from './extract/check.js';
import { EXTRACTOR } from '../options.js';

export type BaseExtractOptions = {
  extractor: string;
};

export default new Command('extract')
  .description('Extracts strings from your projects')
  .addOption(EXTRACTOR)
  .addCommand(extractPrint)
  .addCommand(extractCheck);
