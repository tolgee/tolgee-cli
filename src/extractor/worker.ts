import type { Deferred } from '../utils/deferred';

import { cpus } from 'os';
import { resolve, extname } from 'path';
import { Worker, isMainThread, parentPort } from 'worker_threads';
import { readFile } from 'fs/promises';

import { loadModule } from '../utils/moduleLoader';
import { createDeferred } from '../utils/deferred';

export type WorkerParams = { extractor: string; file: string };

const IS_TS_NODE = extname(__filename) === '.ts';
const MAX_THREADS = cpus().length;

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

const workers = new Set<Worker>();
const jobQueue: Array<[WorkerParams, Deferred]> = [];

function createWorker() {
  const worker = new Worker(__filename, {
    // ts-node workaround
    execArgv: IS_TS_NODE ? ['--require', 'ts-node/register'] : undefined,
  });

  let timeout: NodeJS.Timeout;
  let currentDeferred: Deferred;

  function workOrDie() {
    const job = jobQueue.shift();
    if (!job) {
      worker.terminate();
      return;
    }

    worker.postMessage(job[0]);
    currentDeferred = job[1];
    timeout = setTimeout(() => {
      worker.terminate();
      currentDeferred.reject(new Error('aborted'));
    }, 10e3);
  }

  worker.on('message', (msg) => {
    if ('data' in msg) {
      currentDeferred.resolve(msg.data);
    } else {
      currentDeferred.reject(msg.err);
    }

    clearTimeout(timeout);
    workOrDie();
  });

  workOrDie();
  return worker;
}

export async function callWorker(params: WorkerParams) {
  const deferred = createDeferred();
  jobQueue.push([params, deferred]);

  if (workers.size < MAX_THREADS) {
    const worker = createWorker();
    worker.once('exit', () => workers.delete(worker));
    workers.add(worker);
  }

  return deferred.promise;
}
