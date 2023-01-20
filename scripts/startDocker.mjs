// ---
// Starts a tolgee/tolgee:latest container and waits for it to be ready
// ---

import { spawn } from 'child_process';
import { fetch } from 'undici';

async function enforceBaseLanguage() {
  const { accessToken } = await fetch(
    'http://localhost:22222/api/public/generatetoken',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    }
  ).then((r) => r.json());

  for (let i = 1; i < 4; i++) {
    const locales = await fetch(
      `http://localhost:22222/v2/projects/${i}/languages`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
      }
    ).then((r) => r.json());

    const enId = locales._embedded.languages.find((l) => l.tag === 'en').id;

    await fetch(`http://localhost:22222/v2/projects/${i}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: `test${i}`, baseLanguageId: enId }),
    });
  }
}

console.log('Starting Tolgee test container...');

let stderr = '';

const ENV_FILE = new URL('./tolgee.env', import.meta.url).pathname;
const TG_IMPORT_FOLDER = new URL(
  '../test/__fixtures__/tolgeeImportData',
  import.meta.url
).pathname;

const ARGS = [
  'run',
  '--rm',
  '--name',
  'tolgee_cli_e2e',
  '--pull',
  'always',
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

  if (d.includes('Importing initial project test3')) {
    enforceBaseLanguage().then(() => {
      console.log('Test Tolgee server up on port 22222.');
      process.exit(0);
    });
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
