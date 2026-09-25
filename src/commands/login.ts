import { Command } from 'commander';
import ansi from 'ansi-colors';

import {
  clearAuthStore,
  removeApiKeys,
  removeProjectKey,
  saveApiKey,
  saveOAuthSession,
  saveUserName,
  storedSessionFor,
  type OAuthSession,
} from '../config/credentials.js';
import { NO_PROJECT } from '../config/projectId.js';
import { debug, exitWithError, info, success, warn } from '../utils/logger.js';
import { createTolgeeClient } from '../client/TolgeeClient.js';
import { errorFromLoadable } from '../client/errorFromLoadable.js';
import { browserLogin } from '../oauth/browserLogin.js';
import { ALLOW_IN_CI } from '../oauth/browserEnvironment.js';
import { createOAuthSessionHandle } from '../oauth/session.js';
import {
  revokeAllSessions,
  revokeReplacedSession,
  revokeSessionFor,
} from '../oauth/revoke.js';
import { OAuthError } from '../oauth/authServer.js';
import { printApiKeyLists } from '../utils/apiKeyList.js';
import { getStackTrace } from '../utils/getStackTrace.js';
import { mergeHeaders } from '../utils/headers.js';
import { Schema } from '../schema.js';

type Options = {
  apiUrl: URL;
  apiKey?: string;
  all: boolean;
  list: boolean;
  project: boolean;
  browser: boolean;
  projectId?: number;
  extraHeader?: string[];
};

const loginHandler = (config: Schema) =>
  async function (this: Command, key?: string) {
    const opts: Options = this.optsWithGlobals();
    const headers = mergeHeaders(config.headers, opts.extraHeader);

    if (opts.list) {
      await printApiKeyLists();
      return;
    }

    if (!key) {
      await loginWithBrowser(opts, config, headers);
      return;
    }

    debug(
      `Logging in with API key ${key.slice(0, 5)}...${key.slice(-4)}.\n${getStackTrace()}`
    );

    const keyInfo = await createTolgeeClient({
      baseUrl: opts.apiUrl.toString(),
      apiKey: key,
      headers,
    }).getApiKeyInfo();

    if (keyInfo.type === 'PAT') {
      await revokeSessionFor(opts.apiUrl, headers);
    }

    await saveApiKey(opts.apiUrl, keyInfo);
    success(
      keyInfo.type === 'PAK'
        ? `Logged in as ${keyInfo.username} on ${ansi.blue(opts.apiUrl.hostname)} for project ${ansi.blue(String(keyInfo.project.id))} (${keyInfo.project.name}). Welcome back!`
        : `Logged in as ${keyInfo.username} on ${ansi.blue(opts.apiUrl.hostname)}. Welcome back!`
    );
  };

async function loginWithBrowser(
  opts: Options,
  config: Schema,
  headers: Record<string, string>
) {
  let tokens;
  try {
    tokens = await browserLogin({
      apiUrl: opts.apiUrl,
      project: projectHint(opts, config),
      allowBrowserLaunch: opts.browser,
      extraHeaders: headers,
    });
  } catch (e) {
    if (e instanceof OAuthError) {
      exitWithError(remedyFor(e));
    }
    throw e;
  }

  const session: OAuthSession = {
    type: 'oauth',
    accessToken: tokens.accessToken,
    accessExpires: tokens.accessExpires,
    refreshToken: tokens.refreshToken,
    scopes: tokens.scopes,
    requestedScopes: tokens.requestedScopes,
    apiUrl: opts.apiUrl.toString(),
    projectId: tokens.projectId,
  };
  // Stored before the old grant is ended: a write that fails must not leave a
  // live grant nothing on this machine holds.
  const replaced = await storedSessionFor(opts.apiUrl);
  await saveOAuthSession(opts.apiUrl, session);
  if (replaced) {
    await revokeReplacedSession(replaced, opts.apiUrl, headers);
  }

  const userName = await greetableName(opts, headers, session);
  if (userName) {
    await saveUserName(opts.apiUrl, userName);
  }

  success(
    userName
      ? `Logged in as ${userName} on ${ansi.blue(opts.apiUrl.hostname)}. Welcome back!`
      : `Logged in on ${ansi.blue(opts.apiUrl.hostname)}. Welcome back!`
  );
  if (opts.apiKey) {
    warn(
      'An API key is set through TOLGEE_API_KEY or apiKey in .tolgeerc, and it wins over this login for every command until you unset it.'
    );
  }
}

function remedyFor(e: OAuthError) {
  if (e.kind === 'unsupported') {
    return `${e.message} Log in with an API key instead: tolgee login <API Key>, or pass one with --api-key.`;
  }
  if (e.kind === 'no-browser') {
    return (
      `${e.message} Use an API key: pass --api-key, set TOLGEE_API_KEY, or run tolgee login <API Key> ` +
      `on a machine with a browser. If someone can approve the sign-in from here anyway, set ${ALLOW_IN_CI}=1.`
    );
  }
  return e.message;
}

async function greetableName(
  opts: Options,
  headers: Record<string, string>,
  session: OAuthSession
) {
  const client = createTolgeeClient({
    baseUrl: opts.apiUrl.toString(),
    session: createOAuthSessionHandle(opts.apiUrl, session, headers),
    headers,
  });

  try {
    const user = await client.GET('/v2/user');
    if (user.error) {
      debug(`Could not read the signed-in user: ${errorFromLoadable(user)}`);
      return null;
    }
    return user.data?.name || user.data?.username || null;
  } catch (e: any) {
    debug(`Could not read the signed-in user: ${e.message}`);
    return null;
  }
}

function projectHint(opts: Options, config: Schema) {
  const projectId = configuredProject(opts, config);
  return projectId > 0 ? String(projectId) : undefined;
}

function configuredProject(opts: Options, config: Schema) {
  return Number(opts.projectId ?? config.projectId ?? NO_PROJECT);
}

const logoutHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: Options = this.optsWithGlobals();
    const headers = mergeHeaders(config.headers, opts.extraHeader);

    if (opts.project) {
      const projectId = configuredProject(opts, config);
      if (projectId <= 0) {
        exitWithError(
          'No project to log out of: pass --project-id, or set projectId in .tolgeerc.'
        );
      }
      const dropped = await removeProjectKey(opts.apiUrl, projectId);
      if (dropped) {
        success(
          `The API key stored for project ${projectId} on ${opts.apiUrl.hostname} is gone.`
        );
      } else {
        info(
          `No API key was stored for project ${projectId} on ${opts.apiUrl.hostname}.`
        );
      }
      return;
    }

    if (opts.all) {
      await revokeAllSessions({ instance: opts.apiUrl, headers });
      if (await clearAuthStore()) {
        success(
          "You've been logged out of all Tolgee instances you were logged in."
        );
      } else {
        info('You were not logged in to any Tolgee instance.');
      }
      return;
    }

    await revokeSessionFor(opts.apiUrl, headers);
    if (await removeApiKeys(opts.apiUrl)) {
      success(`You're now logged out of ${opts.apiUrl.hostname}.`);
      return;
    }

    info(`You were not logged in to ${opts.apiUrl.hostname}.`);
    info(
      'Pass --api-url, or set apiUrl in `.tolgeerc`, to log out of another instance.'
    );
  };

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

export const Logout = (config: Schema) =>
  new Command()
    .name('logout')
    .description('Logs out of Tolgee')
    .option('--all', "Log out of *ALL* Tolgee instances you're logged into")
    .option(
      '--project',
      'Remove only the API key stored for this project, keeping everything else'
    )
    .action(logoutHandler(config));
