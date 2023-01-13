import type Client from './client';
import { Option, InvalidArgumentError } from 'commander';
import { DEFAULT_API_URL, SDKS } from './constants';

const builtinSdks = SDKS.join(', ');

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

export type BaseOptions = {
  apiUrl: URL;
  apiKey: string;
  projectId: number;
  client: Client;
};

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

export const EXTRACTOR = new Option(
  '-e, --extractor <extractor>',
  `The extractor to use. Either one of the builtins (${builtinSdks}), or a path to a JS/TS file with a custom extractor.`
).makeOptionMandatory(true);
