import type {
  ExtractionResult,
  ExtractOptions,
  Extractor,
  ParserType,
} from './index.js';
import { fileURLToPath } from 'url';
import { extname, resolve } from 'path';
import { isMainThread, parentPort, SHARE_ENV, Worker } from 'worker_threads';
import { readFileSync } from 'fs';

import internalExtractor from './extractor.js';
import { loadModule } from '../utils/moduleLoader.js';
import { createDeferred, type Deferred } from '../utils/deferred.js';

const FILE_TIME_LIMIT = 60 * 1000; // one minute

export type WorkerParams =
  | {
      file: string;
      parserType: ParserType;
      options: ExtractOptions;
    }
  | {
      extractor: string;
      file: string;
      options: ExtractOptions;
    };

const IS_TSX = extname(import.meta.url) === '.ts';

// --- Worker functions

let extractor: Extractor;

async function handleJob(args: WorkerParams): Promise<ExtractionResult> {
  const file = resolve(args.file);
  const code = readFileSync(file, 'utf8');
  if ('extractor' in args) {
    if (!extractor) {
      extractor = await loadModule(args.extractor).then((mdl) => mdl.default);
    }
    return extractor(code, file, args.options);
  }

  return internalExtractor(code, file, args.parserType, args.options);
}

function workerInit() {
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
  let worker: Worker;
  if (IS_TSX) {
    worker = new Worker(
      `import('tsx/esm/api').then(({ register }) => { register(); import('${fileURLToPath(new URL(import.meta.url))}') })`,
      {
        env: SHARE_ENV,
        eval: true,
      }
    );
  } else {
    worker = new Worker(fileURLToPath(new URL(import.meta.url)), {
      env: SHARE_ENV,
    });
  }

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
      currentDeferred.reject(
        new Error(`Time limit for parsing ${job[0].file} exceeded`)
      );
    }, FILE_TIME_LIMIT);
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
    worker = createWorker();
  }

  return deferred.promise;
}
