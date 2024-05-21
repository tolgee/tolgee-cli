import { Command } from 'commander';

import {
  saveApiKey,
  removeApiKeys,
  clearAuthStore,
} from '../config/credentials.js';
import { success } from '../utils/logger.js';
import { createTolgeeClient } from '../client/newClient/TolgeeClient.js';

type Options = {
  apiUrl: URL;
  all: boolean;
};

async function loginHandler(this: Command, key: string) {
  const opts: Options = this.optsWithGlobals();
  const keyInfo = await createTolgeeClient({
    baseUrl: opts.apiUrl.toString(),
    apiKey: key,
  }).getApiKeyInfo();

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
