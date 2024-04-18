import { Command, Option } from 'commander';

/**
 * Get single option from arguments, without parsing the rest
 */
export function getSingleOption(option: Option, args: string[]) {
  const findOne = new Command();
  findOne.allowUnknownOption().helpOption(false).addOption(option);
  findOne.parse(args);
  return findOne.opts()[option.name()];
}
