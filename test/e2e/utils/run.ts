import type { ChildProcessWithoutNullStreams } from 'child_process';

import { join } from 'path';
import { spawn as spawnProcess } from 'child_process';

const TTY_PRELOAD = join(__dirname, '..', '__internal__', 'tty.ts');
const PRELOAD = join(__dirname, '..', '__internal__', 'preload.ts');
const CLI_INDEX = join(__dirname, '..', '..', '..', 'src', 'index.ts');

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

const BASE_ARGS = [
  '--require',
  'ts-node/register',
  '--require',
  PRELOAD,
  CLI_INDEX,
  '--api-url',
  'http://localhost:22222',
];

const BASE_ARGS_WITH_TTY = [
  '--require',
  'ts-node/register',
  '--require',
  PRELOAD,
  '--require',
  TTY_PRELOAD,
  CLI_INDEX,
  '--api-url',
  'http://localhost:22222',
];

export function spawn(
  args: string[],
  stdin?: boolean,
  env?: Record<string, string>
) {
  return spawnProcess(
    process.argv0,
    [...(stdin ? BASE_ARGS_WITH_TTY : BASE_ARGS), ...args],
    { env: env }
  );
}

function runProcess(cliProcess: ChildProcessWithoutNullStreams) {
  return new Promise<RunResult>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    cliProcess.stdout.setEncoding('utf8');
    cliProcess.stdout.on('data', (d) => (stdout += d));

    cliProcess.stderr.setEncoding('utf8');
    cliProcess.stderr.on('data', (d) => (stderr += d));

    const timeout = setTimeout(() => {
      killed = true;
      cliProcess.kill(9);
      reject(new Error('timeout'));
    }, 5e3);

    cliProcess.on('exit', (code) => {
      if (killed) return;
      clearTimeout(timeout);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

export async function runWithStdin(
  args: string[],
  stdin: string,
  env?: Record<string, string>
) {
  const cliProcess = spawn(args, true, env);
  cliProcess.stdin.write(`${stdin}\n`);
  cliProcess.stdin.end(); // Otherwise, stdin will remain open and process will never exit
  return runProcess(cliProcess);
}

export async function run(args: string[], env?: Record<string, string>) {
  const cliProcess = spawn(args, false, env);
  return runProcess(cliProcess);
}
