import { Client, CompatClient, Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { components } from './internal/schema.generated.js';
import { debug, error } from '../utils/logger.js';
import { SessionExpiredError } from '../oauth/session.js';
import { credentialHeaders, type Credential } from './credential.js';

type BatchJobModelStatus = components['schemas']['BatchJobModel']['status'];

type WebsocketClientOptions = {
  serverUrl?: string;
  authentication: Credential;
  onConnected?: (message: any) => void;
  onError?: (error: any) => void;
  onCredentialExpired?: (error: Error) => void;
  onConnectionClose?: () => void;
};

type Message = {
  type: string;
  actor: any;
  data: any;
};

type Subscription<T extends string> = {
  id?: string;
  channel: T;
  callback: (data: any) => void;
  unsubscribe?: () => void;
};

export const WebsocketClient = (options: WebsocketClientOptions) => {
  let client: CompatClient | undefined;
  let deactivated = false;
  let connected = false;
  let connecting = false;
  let subscriptions: Subscription<any>[] = [];
  let lastConnectToken: string | undefined;

  const resubscribe = () => {
    if (deactivated) {
      return;
    }

    if (client) {
      subscriptions.forEach((subscription) => {
        subscribeToStompChannel(subscription);
      });
    }
  };

  const subscribeToStompChannel = (subscription: Subscription<any>) => {
    if (connected && client) {
      debug(`Subscribing to ${subscription.channel}`);
      const stompSubscription = client.subscribe(
        subscription.channel,
        function (message: any) {
          try {
            const parsed = JSON.parse(message.body) as Message;
            subscription.callback(parsed as any);
          } catch (e: any) {
            error(`Error parsing message: ${e.message}`);
          }
        }
      );
      subscription.unsubscribe = stompSubscription.unsubscribe;
      subscription.id = stompSubscription.id;
    }
  };

  function initClient() {
    client = Stomp.over(() => new SockJS(`${options.serverUrl}/websocket`));
    client.configure({
      reconnectDelay: 3000,
      debug: (msg: string) => {
        debug(redactCredentials(msg));
      },
      // stompjs reconnects on its own and reuses the headers it was handed,
      // so this is the only point where a watch outliving its access token
      // can still put a live one on the wire.
      beforeConnect: freshConnectHeaders,
    });
  }

  async function freshConnectHeaders(stomp: Client) {
    // stompjs awaits this and nothing catches what it throws.
    try {
      await options.authentication.session?.ensureFresh();
    } catch (e: any) {
      if (e instanceof SessionExpiredError) {
        options.onCredentialExpired?.(e);
        return;
      }
      debug(`Could not refresh before connecting: ${e.message}`);
    }
    const { headers, accessToken } = credentialHeaders(options.authentication);
    lastConnectToken = accessToken;
    stomp.connectHeaders = headers;
  }

  function connectIfNotAlready() {
    if (deactivated || connected || connecting) {
      return;
    }

    connecting = true;

    const client = getClient();

    const onConnected = function (message: any) {
      connected = true;
      connecting = false;
      resubscribe();
      options.onConnected?.(message);
    };

    const onDisconnect = function () {
      connected = false;
      connecting = false;
      options.onConnectionClose?.();
    };

    const onError = (err: any) => {
      connecting = false;
      options.onError?.(err);
    };

    client.connect({}, onConnected, onError, onDisconnect);
  }

  const getClient = () => {
    if (client !== undefined) {
      return client;
    }
    initClient();
    return client!;
  };

  /**
   * Subscribes to channel
   * @param channel Channel URI
   * @param callback Callback function to be executed when event is triggered
   * @return Function Function unsubscribing the event listening
   */
  function subscribe<T extends ChannelProject | ChannelUser>(
    channel: T,
    callback: (data: Data<T>) => void
  ): () => void {
    if (deactivated) {
      return () => {};
    }

    connectIfNotAlready();
    const subscription: Subscription<any> = { channel, callback };
    subscriptions.push(subscription);
    subscribeToStompChannel(subscription);

    return () => {
      subscription.unsubscribe?.();
      removeSubscription(subscription);
    };
  }

  function disconnect() {
    if (client) {
      client.disconnect();
    }
  }

  function deactivate() {
    deactivated = true;
    disconnect();
  }

  function removeSubscription(subscription: Subscription<any>) {
    subscriptions = subscriptions.filter((it) => it !== subscription);
  }

  return Object.freeze({
    subscribe,
    deactivate,
    connectIfNotAlready,
    lastConnectToken: () => lastConnectToken,
  });
};

/**
 * stompjs logs whole frames, headers included, and `-v` output is what people
 * paste into bug reports.
 */
export function redactCredentials(frame: string) {
  return frame.replace(/^(authorization|x-api-key):.*$/gim, '$1:<redacted>');
}

export type EventTypeProject =
  | 'translation-data-modified'
  | 'batch-job-progress';
export type ChannelProject = `/projects/${number}/${EventTypeProject}`;

export type EventTypeUser = 'notifications-changed';
export type ChannelUser = `/users/${number}/${EventTypeUser}`;

export type TranslationsModifiedData = WebsocketEvent<{
  translations: EntityModification<'translation'>[] | null;
  keys: EntityModification<'key'>[] | null;
}>;

export type BatchJobProgress = WebsocketEvent<{
  jobId: number;
  processed: number;
  status: BatchJobModelStatus;
  total: number;
  errorMessage: string | undefined;
}>;

export type EntityModification<T> = T extends keyof schemas
  ? {
      id: number;
      modifications: Partial<schemas[T]['mutableFields']>;
      relations: schemas[T]['relations'];
      changeType: 'MOD' | 'DEL' | 'ADD';
    }
  : never;

export type WebsocketEvent<Data> = {
  activityId: number;
  actor: { type: 'user'; data: components['schemas']['UserAccountModel'] };
  data: Data;
};

interface schemas extends Record<string, SchemaDefinition> {
  key: {
    description: {
      name: string;
    };
    mutableFields: {
      name: Modification<string>;
    };
  };
  translation: {
    description: {
      text: string;
    };
    mutableFields: {
      text: Modification<string>;
      state: Modification<components['schemas']['TranslationModel']['state']>;
    };
    relations: {
      key: Relation<schemas['key']['description']>;
      language: Relation<schemas['language']['description']>;
    };
  };
  language: {
    description: {
      name: string;
      tag: string;
    };
  };
}

type Relation<T> = {
  entityId: number;
  data: T;
  relations: Record<string, Relation<any>>;
};

type SchemaDefinition = {
  description: Record<string, any>;
  mutableFields?: Record<string, Modification<any>>;
  relations?: Record<string, Relation<any>>;
};

export type Modification<T> = { old: T; new: T };

export type Data<T> = T extends `/projects/${number}/translation-data-modified`
  ? TranslationsModifiedData
  : T extends `/projects/${number}/batch-job-progress`
    ? BatchJobProgress
    : never;
