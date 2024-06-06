import type { ChildProcessWithoutNullStreams } from 'child_process';

import { fileURLToPath } from 'url';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn as spawnProcess } from 'child_process';

const TTY_PRELOAD = fileURLToPath(
  new URL('../__internal__/tty.cjs', import.meta.url)
);
const PRELOAD = fileURLToPath(
  new URL('../__internal__/preload.cjs', import.meta.url)
);
const CLI_INDEX = fileURLToPath(
  new URL('../../../../dist/cli.js', import.meta.url)
);
const DEBUG_ENABLED = process.env.RUNNER_DEBUG === '1';

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export function spawn(
  args: string[],
  stdin?: boolean,
  env?: Record<string, string>
) {
  const userEnv = env ?? {};
  return spawnProcess(
    process.argv0,
    [
      '--require',
      PRELOAD,
      stdin && '--require',
      stdin && TTY_PRELOAD,
      CLI_INDEX,
      DEBUG_ENABLED && '--verbose',
      '--api-url',
      'http://localhost:22222',
      ...args,
    ].filter(Boolean) as string[],
    {
      env: {
        ...userEnv,
        PATH: process.env.PATH!,
        TOLGEE_CLI_CONFIG_PATH: join(tmpdir(), '.tolgee-e2e'),
      },
    }
  );
}

function runProcess(
  cliProcess: ChildProcessWithoutNullStreams,
  timeoutTime: number
) {
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
    }, timeoutTime);

    cliProcess.on('exit', (code) => {
      if (DEBUG_ENABLED) {
        console.log('::group::stdout\n%s\n::endgroup::', stdout);
        console.log('::group::stderr\n%s\n::endgroup::', stderr);
      }

      if (killed) return;
      clearTimeout(timeout);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

export async function runWithStdin(
  args: string[],
  stdin: string,
  env?: Record<string, string>,
  timeout = 10e3
) {
  const cliProcess = spawn(args, true, env);
  cliProcess.stdin.write(`${stdin}\n`);
  cliProcess.stdin.end(); // Otherwise, stdin will remain open and process will never exit
  return runProcess(cliProcess, timeout);
}

export async function run(
  args: string[],
  env?: Record<string, string>,
  timeout = 10e3
) {
  const cliProcess = spawn(args, false, env);
  return runProcess(cliProcess, timeout);
}
