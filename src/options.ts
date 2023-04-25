import type Client from './client/index.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Option, InvalidArgumentError } from 'commander';
import { DEFAULT_API_URL } from './constants.js';

function parseProjectId(v: string) {
  const val = Number(v);
  if (!Number.isInteger(val) || val < 1) {
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

function parsePath(v: string) {
  const path = resolve(v);
  if (!existsSync(path)) {
    throw new InvalidArgumentError(`The specified path "${v}" does not exist.`);
  }

  return path;
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
  `A path to a custom extractor to use instead of the default one.`
).argParser(parsePath);
