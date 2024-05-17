import { Command, Option } from 'commander';
import { Schema } from '../schema.js';

const pushHandler = (config: Schema) => async function (this: Command) {};

export default (config: Schema) =>
  new Command('tag')
    .description('Update tags in your project.')
    .addOption(
      new Option('--with-extracted', 'Extract keys from code and filter by it.')
    )
    .addOption(new Option('--with-tag <tags...>', 'Filter only keys with tag.'))
    .addOption(
      new Option('--without-tag <tags...>', 'Filter only keys without tag.')
    )
    .addOption(
      new Option('--tag-filtered <tags...>', 'Add tag to filtered keys.')
    )
    .addOption(
      new Option('--tag-other <tags...>', 'Tag keys which are not filtered.')
    )
    .addOption(
      new Option('--untag-filtered <tags...>', 'Remove tag from filtered keys.')
    )
    .addOption(
      new Option(
        '--untag-other <tags...>',
        'Remove tag from keys which are not filtered.'
      )
    )
    .action(pushHandler(config));
