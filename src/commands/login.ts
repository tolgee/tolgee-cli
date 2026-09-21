import { Command } from 'commander';
import ansi from 'ansi-colors';

import {
  clearAuthStore,
  removeApiKeys,
  saveApiKey,
  saveOAuthSession,
} from '../config/credentials.js';
import { debug, exitWithError, success } from '../utils/logger.js';
import {
  createTolgeeClient,
  handleLoadableError,
} from '../client/TolgeeClient.js';
import { browserLogin } from '../oauth/browserLogin.js';
import { OAuthError } from '../oauth/authServer.js';
import { printApiKeyLists } from '../utils/apiKeyList.js';
import { getStackTrace } from '../utils/getStackTrace.js';
import { mergeHeaders } from '../utils/headers.js';
import { Schema } from '../schema.js';

type Options = {
  apiUrl: URL;
  all: boolean;
  list: boolean;
  browser: boolean;
  projectId?: number;
  extraHeader?: string[];
};

const loginHandler = (config: Schema) =>
  async function (this: Command, key?: string) {
    const opts: Options = this.optsWithGlobals();

    if (opts.list) {
      printApiKeyLists();
      return;
    }

    if (!key) {
      await loginWithBrowser(opts, config);
      return;
    }

    debug(
      `Logging in with API key ${key?.slice(0, 5)}...${key?.slice(-4)}.\n${getStackTrace()}`
    );

    const keyInfo = await createTolgeeClient({
      baseUrl: opts.apiUrl.toString(),
      apiKey: key,
      headers: mergeHeaders(config.headers, opts.extraHeader),
    }).getApiKeyInfo();

    await saveApiKey(opts.apiUrl, keyInfo);
    success(
      keyInfo.type === 'PAK'
        ? `Logged in as ${keyInfo.username} on ${ansi.blue(opts.apiUrl.hostname)} for project ${ansi.blue(String(keyInfo.project.id))} (${keyInfo.project.name}). Welcome back!`
        : `Logged in as ${keyInfo.username} on ${ansi.blue(opts.apiUrl.hostname)}. Welcome back!`
    );
  };

/** The consent screen offers every project the user can reach; this only decides which one it opens on. */
function projectHint(opts: Options, config: Schema) {
  const projectId = opts.projectId ?? config.projectId;
  return projectId !== undefined && Number(projectId) > 0
    ? String(projectId)
    : undefined;
}

async function loginWithBrowser(opts: Options, config: Schema) {
  let tokens;
  try {
    tokens = await browserLogin({
      apiUrl: opts.apiUrl,
      project: projectHint(opts, config),
      allowBrowserLaunch: opts.browser,
    });
  } catch (e) {
    if (e instanceof OAuthError) {
      exitWithError(
        e.kind === 'unsupported' || e.kind === 'no-browser'
          ? `${e.message} Log in with an API key instead: tolgee login <API Key>, or pass one with --api-key.`
          : e.message
      );
    }
    throw e;
  }

  const client = createTolgeeClient({
    baseUrl: opts.apiUrl.toString(),
    getAccessToken: () => tokens.accessToken,
    headers: mergeHeaders(config.headers, opts.extraHeader),
  });

  const user = await client.GET('/v2/user');
  handleLoadableError(user);
  const userName = user.data?.name || user.data?.username;

  await saveOAuthSession(opts.apiUrl, {
    type: 'oauth',
    accessToken: tokens.accessToken,
    accessExpires: tokens.accessExpires,
    refreshToken: tokens.refreshToken,
    userName,
  });

  success(
    `Logged in as ${userName} on ${ansi.blue(opts.apiUrl.hostname)}. Welcome back!`
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

export const Login = (config: Schema) =>
  new Command()
    .name('login')
    .description(
      'Login to Tolgee. Without an API key, opens a browser to sign in. You can be logged into multiple Tolgee instances at the same time by using --api-url'
    )
    .option('-l, --list', 'List existing api keys')
    .option(
      '--no-browser',
      'Print the sign-in URL instead of opening a browser. The browser still has to reach this machine: the login completes when it is redirected back to the local address the CLI is listening on'
    )
    .argument(
      '[API Key]',
      'The API key. Can be either a personal access token, or a project key. Omit it to sign in through the browser'
    )
    .action(loginHandler(config));

export const Logout = new Command()
  .name('logout')
  .description('Logs out of Tolgee')
  .option('--all', "Log out of *ALL* Tolgee instances you're logged into")
  .action(logoutHandler);
