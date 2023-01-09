import { Command } from 'commander';

import extractPrint from './extract/print';
import extractCheck from './extract/check';
import { SDKS } from '../constants';

export type BaseExtractOptions = {
  extractor: string;
};

export default new Command('extract')
  .description('Extracts strings from your projects')
  .requiredOption(
    '-e, --extractor <extractor>',
    `The extractor to use. Either one of the builtins (${SDKS.join(
      ', '
    )}), or a path to a JS/TS file with a custom extractor.`
  )
  .addCommand(extractPrint)
  .addCommand(extractCheck);
