import ansi from 'ansi-colors';

import { info, warn } from '../utils/logger.js';
import { openInBrowser, type BrowserOpener } from './browser.js';
import {
  exchangeCode,
  fetchAuthServerMetadata,
  OAuthError,
  type OAuthTokens,
} from './authServer.js';
import {
  detectBrowserAvailability,
  type BrowserAvailability,
} from './browserEnvironment.js';
import { buildAuthorizeUrl } from './authorizeUrl.js';
import { CLI_CLIENT_ID, CLI_SCOPES } from './constants.js';
import { startLoopbackServer } from './loopback.js';
import { createPkcePair, createState } from './pkce.js';

export type BrowserLoginOptions = {
  apiUrl: URL;
  project?: string;
  allowBrowserLaunch?: boolean;
  openBrowser?: BrowserOpener;
  extraHeaders?: Record<string, string>;
};

export async function browserLogin(
  options: BrowserLoginOptions
): Promise<OAuthTokens> {
  const launching = decideLaunch(options);

  const metadata = await fetchAuthServerMetadata(
    options.apiUrl,
    options.extraHeaders
  );
  const server = await startLoopbackServer();

  try {
    const { verifier, challenge } = createPkcePair();
    const state = createState();
    // The server drops the scopes it does not know, so an older instance
    // narrows the login instead of refusing it.
    const authorizeUrl = buildAuthorizeUrl(metadata, {
      clientId: CLI_CLIENT_ID,
      redirectUri: server.redirectUri,
      scopes: CLI_SCOPES,
      state,
      codeChallenge: challenge,
      project: options.project,
    });

    // Listen before the browser is told where to go: the callback can arrive
    // before the call to open it returns.
    const waiting = server.waitForCode({ state, issuer: metadata.issuer });
    // Keeps a rejection that arrives during the launch from being reported as
    // unhandled; the await below is what observes it.
    waiting.catch(() => {});

    if (launching) {
      info(`Opening ${ansi.blue(authorizeUrl)}`);
      await launch(authorizeUrl, options.openBrowser);
    } else {
      info(
        `Open this URL in a browser that can reach this machine:\n  ${ansi.blue(authorizeUrl)}`
      );
    }

    const code = await waiting;

    return exchangeCode(
      metadata,
      {
        clientId: CLI_CLIENT_ID,
        code,
        redirectUri: server.redirectUri,
        codeVerifier: verifier,
      },
      options.extraHeaders
    );
  } finally {
    await server.close();
  }
}

function decideLaunch(options: BrowserLoginOptions): boolean {
  const availability: BrowserAvailability = options.openBrowser
    ? { canLaunch: true }
    : detectBrowserAvailability();

  // Checked before --no-browser too: that flag only moves the browser to
  // another window, and in CI there is none.
  if (!availability.canLaunch && availability.fatal) {
    throw new OAuthError(
      `Cannot sign in through a browser: ${availability.reason}.`,
      'no-browser'
    );
  }

  if (options.allowBrowserLaunch === false) {
    return false;
  }

  if (availability.canLaunch) {
    return true;
  }

  warn(`Not opening a browser: ${availability.reason}.`);
  return false;
}

async function launch(url: string, opener?: BrowserOpener) {
  try {
    await (opener ?? openInBrowser)(url);
  } catch (e: any) {
    // Not fatal: the URL is already printed, and anything that reaches this
    // machine's loopback can finish the login.
    warn(`Could not open a browser: ${e.message}`);
  }
}
