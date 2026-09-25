/**
 * Pre-registered on every Tolgee instance that runs an authorization server;
 * never a CIMD URL.
 */
export const CLI_CLIENT_ID = 'tolgee-cli';

/**
 * A command whose endpoint needs a scope missing here fails for
 * browser-logged-in users only.
 */
export const CLI_SCOPES = [
  'translations.edit',
  'translations.state-edit',
  'keys.create',
  'keys.edit',
  'keys.delete',
  'branch.management',
  'branch.protected-modify',
];
