import { existsSync } from 'fs';
import { resolve } from 'path';
import { Option, InvalidArgumentError } from 'commander';
import { createTolgeeClient } from './client/TolgeeClient.js';
import { VerboseOption } from './extractor/index.js';

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
  client: ReturnType<typeof createTolgeeClient>;
  extractor: string | undefined;
  patterns: string[] | undefined;
  strictNamespace: boolean | undefined;
  verbose: VerboseOption[] | boolean | undefined;
};

export const API_KEY_OPT = new Option(
  '-ak, --api-key <key>',
  'Tolgee API Key. Can be a Project API Key or a Personal Access Token.'
).env('TOLGEE_API_KEY');

export const PROJECT_ID_OPT = new Option(
  '-p, --project-id <id>',
  'Project ID. Only required when using a Personal Access Token.'
).argParser(parseProjectId);

export const API_URL_OPT = new Option(
  '-au, --api-url <url>',
  'The url of Tolgee API.'
).argParser(parseUrlArgument);

export const EXTRACTOR = new Option(
  '-e, --extractor <extractor>',
  `A path to a custom extractor to use instead of the default one.`
).argParser(parsePath);

export const CONFIG_OPT = new Option(
  '-c, --config [config]',
  'A path to tolgeerc config file.'
).argParser(parsePath);

export const FORMAT_OPT = new Option(
  '--format <format>',
  'Localization files format.'
).choices([
  'JSON_TOLGEE',
  'JSON_ICU',
  'JSON_I18NEXT',
  'JSON_JAVA',
  'JSON_PHP',
  'JSON_RUBY',
  'JSON_C',
  'PO_PHP',
  'PO_C',
  'PO_JAVA',
  'PO_ICU',
  'PO_RUBY',
  'PO_PYTHON',
  'APPLE_STRINGS',
  'APPLE_XLIFF',
  'APPLE_XCSTRINGS',
  'PROPERTIES_ICU',
  'PROPERTIES_JAVA',
  'ANDROID_XML',
  'COMPOSE_XML',
  'FLUTTER_ARB',
  'CSV_ICU',
  'CSV_JAVA',
  'CSV_PHP',
  'CSV_RUBY',
  'YAML_RUBY',
  'YAML_JAVA',
  'YAML_ICU',
  'YAML_PHP',
  'XLIFF_ICU',
  'XLIFF_JAVA',
  'XLIFF_PHP',
  'XLIFF_RUBY',
  'RESX_ICU',
  'XLSX_ICU',
  'XLSX_JAVA',
  'XLSX_PHP',
  'XLSX_RUBY',
]);

export const FILE_PATTERNS = new Option(
  '-pt, --patterns <patterns...>',
  'File glob patterns to include (hint: make sure to escape it in quotes, or your shell might attempt to unroll some tokens like *)'
);

export const STRICT_NAMESPACE = new Option('--strict-namespace').hideHelp(true);

export const STRICT_NAMESPACE_NEGATION = new Option(
  '--no-strict-namespace',
  "No require namespace to be reachable, use if you don't use namespaces."
);

export const DEFAULT_NAMESPACE = new Option(
  '--default-namespace <namespace>',
  'Default namespace used in extraction if not specified otherwise.'
);

export const PARSER = new Option(
  '--parser <parser>',
  'Override parser detection.'
).choices(['react', 'vue', 'svelte', 'ngx']);

export const VERBOSE = new Option(
  '-v, --verbose [rules...]',
  'Enable verbose logging. If you want more info to be logged pass an option.'
).choices(['extractor']);
