import { Option, InvalidArgumentError } from 'commander';

export const API_KEY_OPT = new Option(
  '-ak, --api-key <key>',
  'Tolgee API Key. Can be a Project API Key or a Personal Access Token.'
)
  .env('TOLGEE_API_KEY')
  .makeOptionMandatory(true);

export const PROJECT_ID_OPT = new Option(
  '-p, --project-id <id>',
  'Project ID. Only required when using a Personal Access Token.'
)
  .default(-1)
  .argParser((v) => {
    const val = parseInt(v);
    if (isNaN(val) || val < 1) {
      throw new InvalidArgumentError('Not a valid project ID.');
    }
    return val;
  });

export const API_URL_OPT = new Option(
  '-au, --api-url <url>',
  'The url of Tolgee API.'
)
  .default(new URL('https://app.tolgee.io'))
  .argParser((v) => {
    try {
      return new URL(v);
    } catch (e) {
      throw new InvalidArgumentError('Malformed URL.');
    }
  });
