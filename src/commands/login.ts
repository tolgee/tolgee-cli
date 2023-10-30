import type { ApiKeyInfo } from '../client/index.js';
import { Command } from 'commander';
import RestClient from '../client/index.js';

import { HttpError } from '../client/errors.js';
import {
  saveApiKey,
  removeApiKeys,
  clearAuthStore,
} from '../config/credentials.js';
import { success, error } from '../utils/logger.js';

type Options = {
  apiUrl: URL;
  all: boolean;
};

async function loginHandler(this: Command, key: string) {
  const opts: Options = this.optsWithGlobals();
  let keyInfo: ApiKeyInfo;
  try {
    keyInfo = await RestClient.getApiKeyInformation(opts.apiUrl, key);
  } catch (e) {
    if (e instanceof HttpError && e.response.statusCode === 401) {
      error("Couldn't log in: the API key you provided is invalid.");
      process.exit(1);
    }

    throw e;
  }

  await saveApiKey(opts.apiUrl, keyInfo);
  success(
    keyInfo.type === 'PAK'
      ? `Logged in as ${keyInfo.username} on ${opts.apiUrl.hostname} for project ${keyInfo.project.name} (#${keyInfo.project.id}). Welcome back!`
      : `Logged in as ${keyInfo.username} on ${opts.apiUrl.hostname}. Welcome back!`
  );
}

async function logoutHandler(this: Command) {
  const opts: Options = this.optsWithGlobals();

  if (opts.all) {
    await clearAuthStore();
    success(
      "You've been logged out of all Tolgee instances you were logged in."
    );
    return;
  }

  await removeApiKeys(opts.apiUrl);
  success(`You're now logged out of ${opts.apiUrl.hostname}.`);
}

export const Login = new Command()
  .name('login')
  .description(
    'Login to Tolgee with an API key. You can be logged into multiple Tolgee instances at the same time by using --api-url'
  )
  .argument(
    '<API Key>',
    'The API key. Can be either a personal access token, or a project key'
  )
  .action(loginHandler);

export const Logout = new Command()
  .name('logout')
  .description('Logs out of Tolgee')
  .option('--all', "Log out of *ALL* Tolgee instances you're logged into")
  .action(logoutHandler);
