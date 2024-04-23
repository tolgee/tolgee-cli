import { Command } from 'commander';

import extractPrint from './extract/print.js';
import extractCheck from './extract/check.js';
import { EXTRACTOR } from '../options.js';
import { Schema } from '../schema.js';

export type BaseExtractOptions = {
  extractor: string;
};

export default (config: Schema) =>
  new Command('extract')
    .description('Extracts strings from your projects')
    .addOption(EXTRACTOR.default(config.extractor))
    .addCommand(extractPrint(config))
    .addCommand(extractCheck(config));
