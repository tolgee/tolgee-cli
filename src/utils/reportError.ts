import { error, exitWithError } from './logger.js';
import { OAuthError } from '../oauth/authServer.js';
import { SessionExpiredError } from '../oauth/session.js';

export function reportError(e: any): never {
  if (e instanceof SessionExpiredError || e instanceof OAuthError) {
    exitWithError(e.message);
  }

  error('An unexpected error occurred while running the command.');
  error(
    'Please report this to our issue tracker: https://github.com/tolgee/tolgee-cli/issues'
  );
  exitWithError(e);
}
