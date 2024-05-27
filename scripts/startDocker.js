// ---
// Starts a tolgee/tolgee:latest container and waits for it to be ready
// ---

import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

async function main() {
  try {
    const response = await fetch('http://localhost:22222/actuator/health').then(
      (r) => r.json()
    );
    if (response.status === 'UP') {
      console.log('Backend already running on port 22222');
      process.exit(0);
    }
  } catch (e) {
    // backend not running - continue
  }

  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch {
    console.error(
      "This script uses docker, and it isn't running - please start docker and try again!"
    );
    process.exit(1);
  }

  console.log('Starting Tolgee test container. This might take a while...');

  let stderr = '';

  const ENV_FILE = fileURLToPath(new URL('./tolgee.env', import.meta.url));
  const TG_IMPORT_FOLDER = fileURLToPath(
    new URL('../test/__fixtures__/tolgeeImportData', import.meta.url)
  );

  const ARGS = [
    'run',
    '--rm',
    '--name',
    'tolgee_cli_e2e',
    '--publish',
    '22222:8080',
    '--env-file',
    ENV_FILE,
    '--mount',
    `type=bind,source=${TG_IMPORT_FOLDER},target=/mnt/tolgee-import-data`,
    'tolgee/tolgee:latest',
  ];

  if (process.env.RUNNER_DEBUG === '1') {
    console.log('Command:');
    console.log('docker %s', ARGS.join(' '));
  }

  const docker = spawn('docker', ARGS, {
    detached: true,
  });

  docker.stdout.setEncoding('utf8');
  docker.stdout.on('data', (d) => {
    if (process.env.RUNNER_DEBUG === '1') {
      console.log(d);
    }

    if (d.includes('Completed initialization in')) {
      console.log('Test Tolgee server up on port 22222.');
      process.exit(0);
    }
  });

  docker.stderr.setEncoding('utf8');
  docker.stderr.on('data', (d) => {
    stderr += d;
    if (d.includes('The container name "/tolgee_cli_e2e" is already in use')) {
      console.log('Container already running.');
      process.exit(0);
    }
  });

  docker.on('close', () => {
    console.log('Could not spin up Docker container.');
    console.log('---');
    console.log(stderr);
    console.log('---');
    process.exit(1);
  });

  setTimeout(() => {
    console.log('Timed out. Killing Docker process.');
    docker.kill(9);
    process.exit(1);
  }, 120e3);
}

main();
