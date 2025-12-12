import { CompatClient, Stomp } from '@stomp/stompjs'; // @ts-ignore
import SockJS from 'sockjs-client';
import { components } from './internal/schema.generated.js';
import { debug, error } from '../utils/logger.js';

type BatchJobModelStatus = components['schemas']['BatchJobModel']['status'];

type WebsocketClientOptions = {
  serverUrl?: string;
  authentication: {
    jwtToken?: string;
    apiKey?: string;
  };
  onConnected?: (message: any) => void;
  onError?: (error: any) => void;
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
  let _client: CompatClient | undefined;
  let _deactivated = false;
  let connected = false;
  let connecting = false;
  let subscriptions: Subscription<any>[] = [];

  const resubscribe = () => {
    if (_deactivated) {
      return;
    }

    if (_client) {
      subscriptions.forEach((subscription) => {
        subscribeToStompChannel(subscription);
      });
    }
  };

  const subscribeToStompChannel = (subscription: Subscription<any>) => {
    if (connected && _client) {
      debug(`Subscribing to ${subscription.channel}`);
      const stompSubscription = _client.subscribe(
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
    _client = Stomp.over(() => new SockJS(`${options.serverUrl}/websocket`));
    _client.configure({
      reconnectDelay: 3000,
      debug: (msg: string) => {
        debug(msg);
      },
    });
  }

  function connectIfNotAlready() {
    if (_deactivated || connected || connecting) {
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

    const onError = (error: any) => {
      connecting = false;
      options.onError?.(error);
    };

    client.connect(
      getAuthentication(options),
      onConnected,
      onError,
      onDisconnect
    );
  }

  const getClient = () => {
    if (_client !== undefined) {
      return _client;
    }
    initClient();
    return _client!;
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
    if (_deactivated) {
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
    if (_client) {
      _client.disconnect();
    }
  }

  function deactivate() {
    _deactivated = true;
    disconnect();
  }

  function removeSubscription(subscription: Subscription<any>) {
    subscriptions = subscriptions.filter((it) => it !== subscription);
  }

  return Object.freeze({ subscribe, deactivate, connectIfNotAlready });
};

function getAuthentication(options: WebsocketClientOptions) {
  if (options.authentication.jwtToken) {
    return { jwtToken: options.authentication.jwtToken };
  }

  if (options.authentication.apiKey) {
    return { 'x-api-key': options.authentication.apiKey };
  }

  return null;
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
