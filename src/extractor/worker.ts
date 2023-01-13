import { resolve, extname } from 'path';
import { Worker, isMainThread, parentPort } from 'worker_threads';
import { readFile } from 'fs/promises';

// TODO: this solution won't handle new integrations and it will need a slight tweaking before adding new ones
import internalExtractor from './presets/react';
import { loadModule } from '../utils/moduleLoader';
import { type Deferred, createDeferred } from '../utils/deferred';

export type WorkerParams = { extractor?: string; file: string };

const IS_TS_NODE = extname(__filename) === '.ts';

// --- Worker functions

let loadedExtractor: string | undefined | symbol = Symbol('unloaded');
let extractor: Function;

async function handleJob(args: WorkerParams) {
  if (loadedExtractor !== args.extractor) {
    loadedExtractor = args.extractor;
    extractor = args.extractor
      ? await loadModule(args.extractor).then((mdl) => mdl.default)
      : internalExtractor
  }

  const file = resolve(args.file);
  const code = await readFile(file, 'utf8');
  return extractor(code, file);
}

async function workerInit() {
  parentPort!.on('message', (params) => {
    handleJob(params)
      .then((res) => parentPort!.postMessage({ data: res }))
      .catch((e) => parentPort!.postMessage({ err: e }));
  });
}

if (!isMainThread) workerInit();

// --- Main thread functions

let worker: Worker;
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

  if (!worker) {
    worker = createWorker()
  }

  return deferred.promise;
}
