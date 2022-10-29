import type { Deferred } from '../utils/deferred';

import { extname } from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { readFile } from 'fs/promises';

import { loadModule } from '../utils/moduleLoader';
import { createDeferred } from '../utils/deferred';

export type FileParams = { extractor: string; file: string };
export type CodeParams = { extractor: string; code: string };
export type WorkerParams = FileParams | CodeParams;

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

  const code = 'file' in args ? await readFile(args.file, 'utf8') : args.code;

  return extractor(code);
}

async function workerInit() {
  parentPort!.on('message', (msg) => {
    handleJob(msg.data)
      .then((res) => parentPort!.postMessage({ id: msg.id, data: res }))
      .catch((e) => parentPort!.postMessage({ id: msg.id, err: e }));
  });
}

if (!isMainThread) workerInit();

// --- Main thread functions

let queryId = 0;
let worker: Worker | null;
const queries: Map<number, Deferred<string[]>> = new Map();

function clearWorker() {
  worker = null;
  for (const deferred of queries.values()) {
    deferred.reject('aborted');
  }
  queries.clear();
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(__filename, {
      // ts-node workaround
      execArgv: IS_TS_NODE ? ['--require', 'ts-node/register'] : undefined,
    });

    worker.once('exit', clearWorker);
    worker.on('message', (m) => {
      const deferred = queries.get(m.id);
      queries.delete(m.id);

      if (!deferred) return;
      if ('data' in m) deferred.resolve(m.data);
      if ('err' in m) deferred.reject(m.err);
    });

    // Let the process exit even if the worker is alive
    worker.unref();
  }

  return worker;
}

export async function callWorker(params: WorkerParams) {
  const worker = getWorker();
  const deferred = createDeferred<string[]>();
  const id = queryId++;

  // Send request to the worker
  queries.set(id, deferred);
  worker.postMessage({ id: id, data: params });

  // Timeout
  const timer = setTimeout(() => worker.terminate(), 10e3);
  deferred.promise.finally(() => clearTimeout(timer));

  return deferred.promise;
}
