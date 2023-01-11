import { Command } from 'commander';

import extractPrint from './extract/print';
import extractCheck from './extract/check';
import { EXTRACTOR } from '../options';

export type BaseExtractOptions = {
  extractor: string;
};

export default new Command('extract')
  .description('Extracts strings from your projects')
  .addOption(EXTRACTOR)
  .addCommand(extractPrint)
  .addCommand(extractCheck);
