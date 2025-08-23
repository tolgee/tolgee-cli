import { WebsocketClient } from '../client/WebsocketClient.js';
import { debug, error, info, success } from './logger.js';
import {
  getLastModified,
  setLastModified,
  extractLastModifiedFromResponse,
} from './lastModifiedStorage.js';
import { clearInterval } from 'node:timers';

// Polling interval as backup when WebSocket is not available (in seconds)
const POLLING_INTERVAL_SECONDS = 60;
// Debounce delay for schedulePull in milliseconds
const SCHEDULE_PULL_DEBOUNCE_MS = 500;

export type WatchHandlerOptions = {
  apiUrl: URL;
  apiKey: string;
  projectId: number;
  doPull: () => Promise<void>;
};

export async function startWatching(
  options: WatchHandlerOptions
): Promise<void> {
  const { apiUrl, apiKey, projectId, doPull } = options;

  // Watch mode using WebsocketClient on translation-data-modified
  info('Watching for translation changes... Press Ctrl+C to stop.');

  let pulling = false;
  let debounceTimer: NodeJS.Timeout | undefined;
  let pollingTimer: NodeJS.Timeout | undefined;
  let lastExecutionTime = 0;

  const executePull = async (lastModified?: string) => {
    if (pulling) return;
    pulling = true;
    lastExecutionTime = Date.now();
    try {
      await doPull();
      // Store last modified timestamp after successful pull
      if (lastModified) {
        setLastModified(projectId, lastModified);
      }
    } catch (e: any) {
      error('Error during pull: ' + e.message);
      debug(e);
    } finally {
      pulling = false;
    }
  };

  const schedulePull = async (lastModified?: string) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;

    // If last execution was more than 500ms ago, execute immediately
    if (timeSinceLastExecution >= SCHEDULE_PULL_DEBOUNCE_MS) {
      await executePull(lastModified);
    } else {
      // Otherwise, schedule the update with debounce
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => executePull(lastModified), SCHEDULE_PULL_DEBOUNCE_MS);
    }
  };

  // Polling mechanism as backup
  const startPolling = () => {
    clearInterval(pollingTimer);
    const poll = async () => {
      if (pulling) return;
      await schedulePull();
    };

    // Set up periodic polling
    pollingTimer = setInterval(poll, POLLING_INTERVAL_SECONDS * 1000);
  };

  const wsClient = WebsocketClient({
    serverUrl: new URL(apiUrl).origin,
    authentication: { apiKey: apiKey },
    onConnected: () => {
      // Pull on every connection/reconnection to ensure we're up to date
      schedulePull();
      // Start polling as backup
      startPolling();
    },
    onError: () => {
      // Non-fatal: just inform
      info('Websocket error encountered. Reconnecting...');
    },
    onConnectionClose: () => {
      info('Websocket connection closed. Attempting to reconnect...');
    },
  });

  const channel = `/projects/${projectId}/translation-data-modified` as const;
  const unsubscribe = wsClient.subscribe(channel, () => {
    schedulePull();
  });

  const shutdown = () => {
    try {
      unsubscribe();
    } catch {}
    try {
      wsClient.deactivate();
    } catch {}
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

  // Keep process alive
  await new Promise<void>(() => {});
}
