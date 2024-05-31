import { Command } from 'commander';

import extractPrint from './extract/print.js';
import extractCheck from './extract/check.js';
import { Schema } from '../schema.js';

export default (config: Schema) =>
  new Command('extract')
    .description('Extracts strings from your projects')
    .addCommand(extractPrint(config))
    .addCommand(extractCheck(config));
