import { Option, InvalidArgumentError } from 'commander';
import { DEFAULT_API_URL } from './constants';

function parseProjectId(v: string) {
  const val = Number(v);
  if (isNaN(val) || val < 1) {
    throw new InvalidArgumentError('Not a valid project ID.');
  }
  return val;
}

function parseUrlArgument(v: string) {
  try {
    return new URL(v);
  } catch {
    throw new InvalidArgumentError('Malformed URL.');
  }
}

export const API_KEY_OPT = new Option(
  '-ak, --api-key <key>',
  'Tolgee API Key. Can be a Project API Key or a Personal Access Token.'
).env('TOLGEE_API_KEY');

export const PROJECT_ID_OPT = new Option(
  '-p, --project-id <id>',
  'Project ID. Only required when using a Personal Access Token.'
)
  .default(-1)
  .argParser(parseProjectId);

export const API_URL_OPT = new Option(
  '-au, --api-url <url>',
  'The url of Tolgee API.'
)
  .default(DEFAULT_API_URL)
  .argParser(parseUrlArgument);
