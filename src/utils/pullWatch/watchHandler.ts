import { WebsocketClient } from '../../client/WebsocketClient.js';
import type { OAuthSessionHandle } from '../../oauth/session.js';
import { debug, error, info, success } from '../logger.js';
import { createTolgeeClient } from '../../client/TolgeeClient.js';
import { AuthErrorHandler } from './AuthErrorHandler.js';
import { pullScheduler } from './pullScheduler.js';

const RENEWAL_INTERVAL_MS = 5 * 60_000;

export type WatchHandlerOptions = {
  apiUrl: URL;
  apiKey?: string;
  session?: OAuthSessionHandle;
  projectId: number;
  client: ReturnType<typeof createTolgeeClient>;
  doPull: () => Promise<void>;
};

export async function startWatching(
  options: WatchHandlerOptions
): Promise<void> {
  const { apiUrl, apiKey, session, projectId, doPull, client } = options;

  // Watch mode using WebsocketClient on translation-data-modified
  info('Watching for translation changes... Press Ctrl+C to stop.');

  const pulls = pullScheduler({
    projectId,
    doPull,
    onCredentialDied: endBecauseCredentialDied,
  });
  const authErrors = AuthErrorHandler(client, {
    renewCredential: session ? renewCredential : undefined,
  });
  let lastServerRefresh = 0;
  let unsubscribe: (() => void) | undefined;

  const wsClient = WebsocketClient({
    serverUrl: apiUrl.origin,
    authentication: { apiKey, session },
    onConnected: () => {
      debug(
        'WebSocket connected and subscriptions active. Performing initial pull...'
      );
      pulls.schedulePull();
    },
    onCredentialExpired: (expired) => endBecauseCredentialDied(expired),
    onError: (err) => {
      authErrors.handleAuthErrors(err, shutdown).catch((e: any) => {
        debug('Error in handleAuthErrors: ' + e);
      });
      // Non-fatal: just inform
      info('Websocket error encountered. Reconnecting...');
    },
    onConnectionClose: () => {
      info('Websocket connection closed. Attempting to reconnect...');
    },
  });

  const channel = `/projects/${projectId}/translation-data-modified` as const;

  function subscribe() {
    unsubscribe = wsClient.subscribe(channel, () => {
      debug('Data change detected by websocket. Pulling now... ');
      pulls.schedulePull();
      pulls.startPolling();
    });
  }

  // Tolgee accepts every CONNECT and refuses at SUBSCRIBE, so nothing about
  // the connection says whether the credential was taken. stompjs would retry
  // a refused one every three seconds, so the server is asked at most once
  // per interval; a session another process stored meanwhile costs nothing.
  async function renewCredential() {
    if (Date.now() - lastServerRefresh < RENEWAL_INTERVAL_MS) {
      return session!.adoptNewerSession();
    }

    const outcome = await session!.refreshAfterUnauthorized(
      wsClient.lastConnectToken() ?? session!.getAccessToken()
    );
    if (outcome === 'refreshed') {
      lastServerRefresh = Date.now();
    }
    return true;
  }

  function endBecauseCredentialDied(expired: Error) {
    error(expired.message);
    shutdown(1);
  }

  function shutdown(code = 0) {
    try {
      unsubscribe?.();
    } catch {
      // Ignore errors during shutdown cleanup
    }
    try {
      wsClient.deactivate();
    } catch {
      // Ignore errors during shutdown cleanup
    }
    pulls.stop();
    if (code === 0) {
      success('Stopped watching. Bye!');
    }
    process.exit(code);
  }

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  subscribe();

  // Keep process alive
  await new Promise<void>(() => {});
}
