import { Command } from 'commander';
import RestClient from '../client';
import { HttpError } from '../client/errors';

import { storeAuthToken, clearAuthStore } from '../config';
import { API_URL_OPT } from '../options';
import { success, error } from '../utils/logger';

type Options = {
  apiUrl: URL;
  all: boolean;
};

async function loginHandler(this: Command, token: string) {
  const opts: Options = this.optsWithGlobals();

  let user: string;
  try {
    if (token.startsWith('tgpak_')) {
      const info = await RestClient.getApiKeyInformation(opts.apiUrl, token);
      const username = info.userFullName || info.username || '<unknown user>';
      user = `${username} (project: ${info.projectName})`;
    } else {
      const info = await RestClient.getPersonalAccessTokenUser(
        opts.apiUrl,
        token
      );
      user = info.name || info.username;
    }
  } catch (e: any) {
    if (e instanceof HttpError) {
      error(
        e.response.status >= 500
          ? `The Tolgee server reported an error (${e.response.status} ${e.response.statusText}). Try again later.`
          : 'Invalid token.'
      );
    } else {
      throw e;
    }

    process.exit(1);
  }

  await storeAuthToken(opts.apiUrl, token);
  success(`Logged in as ${user} on ${opts.apiUrl.hostname}. Welcome back!`);
}

async function logoutHandler(this: Command) {
  const opts: Options = this.optsWithGlobals();

  if (opts.all) {
    await clearAuthStore();
    success(
      `You've been logged out of all Tolgee instances you were logged in.`
    );
  } else {
    await storeAuthToken(opts.apiUrl, null);
    success(`You're now logged out of ${opts.apiUrl.hostname}.`);
  }
}

export const Login = new Command()
  .name('login')
  .description(
    'Login to Tolgee with an API key. You can be logged into multiple Tolgee instances at the same time by using --api-url.'
  )
  .argument('<token>', 'The authentication token.')
  .addOption(API_URL_OPT)
  .action(loginHandler);

export const Logout = new Command()
  .name('logout')
  .description('Logs out of Tolgee.')
  .addOption(API_URL_OPT)
  .option('--all', "Log out of *ALL* Tolgee instances you're logged into.")
  .action(logoutHandler);
