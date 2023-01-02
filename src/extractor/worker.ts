import { resolve, extname } from 'path';
import { Worker, isMainThread, parentPort } from 'worker_threads';
import { readFile } from 'fs/promises';

import { loadModule } from '../utils/moduleLoader';
import { createDeferred } from '../utils/deferred';

export type WorkerParams = { extractor: string; file: string };

const IS_TS_NODE = extname(__filename) === '.ts';

// --- Worker functions

let loadedExtractor: string;
let extractor: Function;

async function loadExtractor(extractorScript: string) {
  const mdl = await loadModule(extractorScript);
  extractor = mdl.default;
}

async function handleJob(args: WorkerParams) {
  if (loadedExtractor !== args.extractor) {
    await loadExtractor(args.extractor);
  }

  const file = resolve(args.file);
  const code = await readFile(file, 'utf8');
  return extractor(code, file);
}

async function workerInit() {
  parentPort!.on('message', (msg) => {
    handleJob(msg)
      .then((res) => parentPort!.postMessage({ data: res }))
      .catch((e) => parentPort!.postMessage({ err: e }));
  });
}

if (!isMainThread) workerInit();

// --- Main thread functions

let worker: Worker;

export async function callWorker(params: WorkerParams) {
  if (!worker) {
    worker = new Worker(__filename, {
      // ts-node workaround
      execArgv: IS_TS_NODE ? ['--require', 'ts-node/register'] : undefined,
    });

    worker.unref();
  }

  const timeout = setTimeout(() => {
    worker.terminate();
    deferred.reject(new Error('aborted'));
  }, 10e3);

  const deferred = createDeferred();
  worker.postMessage(params);
  worker.once('message', (msg) => {
    if ('data' in msg) {
      deferred.resolve(msg.data);
    } else {
      deferred.reject(msg.err);
    }

    clearTimeout(timeout);
  });

  return deferred.promise;
}
