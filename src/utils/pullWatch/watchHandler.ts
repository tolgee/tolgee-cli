import { WebsocketClient } from '../../client/WebsocketClient.js';
import { debug, error, info, success } from '../logger.js';
import { setETag } from '../eTagStorage.js';
import { clearInterval } from 'node:timers';
import { createTolgeeClient } from '../../client/TolgeeClient.js';
import { AuthErrorHandler } from './AuthErrorHandler.js';

// Polling interval as backup when WebSocket is not available (in seconds)
const POLLING_INTERVAL_SECONDS = 60;
// Debounce delay for schedulePull in milliseconds
const SCHEDULE_PULL_DEBOUNCE_MS = 500;

export type WatchHandlerOptions = {
  apiUrl: URL;
  apiKey: string;
  projectId: number;
  client: ReturnType<typeof createTolgeeClient>;
  doPull: () => Promise<void>;
};

export async function startWatching(
  options: WatchHandlerOptions
): Promise<void> {
  const { apiUrl, apiKey, projectId, doPull, client } = options;

  // Watch mode using WebsocketClient on translation-data-modified
  info('Watching for translation changes... Press Ctrl+C to stop.');

  let pulling = false;

  /**
   * Pending handles the situation when changes are detected while the pull is
   * already in progress.
   */
  let pending = false;
  let pendingEtag: string | undefined;
  let debounceTimer: NodeJS.Timeout | undefined;
  let pollingTimer: NodeJS.Timeout | undefined;
  let lastExecutionTime = 0;

  const executePull = async (etag?: string) => {
    if (pulling) {
      pending = true;
      pendingEtag = etag;
      return;
    }
    pulling = true;
    lastExecutionTime = Date.now();
    try {
      await doPull();
      // Store ETag after successful pull
      if (etag) {
        setETag(projectId, etag);
      }
    } catch (e: any) {
      error('Error during pull: ' + e.message);
      debug(e);
    } finally {
      pulling = false;
      // If there was a pending pull (data changed when pulling), execute it now
      if (pending) {
        pending = false;
        const capturedEtag = pendingEtag;
        pendingEtag = undefined;
        void executePull(capturedEtag);
      }
    }
  };

  const schedulePull = async (etag?: string) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;

    // If last execution was more than 500ms ago, execute immediately
    if (timeSinceLastExecution >= SCHEDULE_PULL_DEBOUNCE_MS) {
      await executePull(etag);
    } else {
      // Otherwise, schedule the update with debounce
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(
        () => executePull(etag),
        SCHEDULE_PULL_DEBOUNCE_MS
      );
    }
  };

  // Polling mechanism as backup
  const startPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    const poll = async () => {
      if (pulling) return;
      debug('Polling for changes...');
      await schedulePull();
    };

    // Set up periodic polling
    pollingTimer = setInterval(poll, POLLING_INTERVAL_SECONDS * 1000);
  };

  const wsClient = WebsocketClient({
    serverUrl: new URL(apiUrl).origin,
    authentication: { apiKey: apiKey },
    onError: (error) => {
      AuthErrorHandler(client)
        .handleAuthErrors(error, shutdown)
        .catch((err: any) => {
          debug('Error in handleAuthErrors: ' + err);
        });
      // Non-fatal: just inform
      info('Websocket error encountered. Reconnecting...');
    },
    onConnectionClose: () => {
      info('Websocket connection closed. Attempting to reconnect...');
    },
  });

  const channel = `/projects/${projectId}/translation-data-modified` as const;

  let unsubscribe: (() => void) | undefined;

  function subscribe() {
    unsubscribe = wsClient.subscribe(channel, () => {
      debug('Data change detected by websocket. Pulling now... ');
      schedulePull();
      startPolling();
    });
  }

  const shutdown = () => {
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
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    success('Stopped watching. Bye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  subscribe();
  schedulePull();

  // Keep process alive
  await new Promise<void>(() => {});
}
