// ---
// Starts a tolgee/tolgee:latest container and waits for it to be ready
// ---

import { spawn } from 'child_process';

console.log('Starting Tolgee test container...');

const docker = spawn(
  'docker',
  [
    'run',
    '--rm',
    '--name',
    'tolgee_cli_e2e',
    '--pull',
    'always',
    '--env-file',
    new URL('./tolgee.env', import.meta.url).pathname,
    '-p',
    '22222:8080',
    'tolgee/tolgee:latest',
  ],
  {
    detached: true,
  }
);

docker.stdout.setEncoding('utf8');
docker.stdout.on('data', (d) => {
  if (d.includes('Started Application.Companion')) {
    console.log('Test Tolgee server up on port 22222.');
    process.exit(0);
  }
});

docker.stderr.setEncoding('utf8');
docker.stderr.on('data', (d) => {
  if (d.includes('The container name "/tolgee_cli_e2e" is already in use')) {
    console.log('Container already running.');
    process.exit(0);
  }
});

docker.on('close', () => {
  console.log('Could not spin up Docker container.');
  process.exit(1);
});

setTimeout(() => {
  console.log('Timed out. Killing Docker process.');
  docker.kill(9);
  process.exit(1);
}, 120e3);
