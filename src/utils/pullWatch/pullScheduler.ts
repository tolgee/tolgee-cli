import { SessionExpiredError } from '../../oauth/session.js';
import { debug, error } from '../logger.js';
import { setETag } from '../eTagStorage.js';

// Polling interval as backup when WebSocket is not available (in seconds)
const POLLING_INTERVAL_SECONDS = 60;
// Debounce delay for schedulePull in milliseconds
const SCHEDULE_PULL_DEBOUNCE_MS = 500;

export type PullScheduler = {
  schedulePull(etag?: string): void;
  startPolling(): void;
  stop(): void;
};

export function pullScheduler(options: {
  projectId: number;
  doPull: () => Promise<void>;
  onCredentialDied: (expired: Error) => void;
}): PullScheduler {
  const { projectId, doPull, onCredentialDied } = options;

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

  // Node kills the process on an unhandled rejection, and nobody awaits these.
  const detached = (work: Promise<void>) =>
    void work.catch((e: any) => debug('Pull failed: ' + (e?.message ?? e)));

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
      if (e instanceof SessionExpiredError) {
        onCredentialDied(e);
        return;
      }
      error('Error during pull: ' + e.message);
      debug(e);
    } finally {
      pulling = false;
      // If there was a pending pull (data changed when pulling), execute it now
      if (pending) {
        pending = false;
        const capturedEtag = pendingEtag;
        pendingEtag = undefined;
        detached(executePull(capturedEtag));
      }
    }
  };

  const schedulePull = (etag?: string) => {
    const timeSinceLastExecution = Date.now() - lastExecutionTime;

    // If last execution was more than 500ms ago, execute immediately
    if (timeSinceLastExecution >= SCHEDULE_PULL_DEBOUNCE_MS) {
      detached(executePull(etag));
      return;
    }
    // Otherwise, schedule the update with debounce
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(
      () => detached(executePull(etag)),
      SCHEDULE_PULL_DEBOUNCE_MS
    );
  };

  // Polling mechanism as backup
  const startPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    pollingTimer = setInterval(() => {
      if (pulling) return;
      debug('Polling for changes...');
      schedulePull();
    }, POLLING_INTERVAL_SECONDS * 1000);
  };

  const stop = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };

  return { schedulePull, startPolling, stop };
}
