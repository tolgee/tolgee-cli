import { execSync } from 'node:child_process';

export default () => {
  execSync('npm run --silent build', { stdio: 'inherit' });

  // Only start Docker backend if no alternative backend URL is provided
  if (!process.env.TOLGEE_TEST_BACKEND_URL) {
    console.log('Starting Docker backend (no TOLGEE_TEST_BACKEND_URL provided)');
    execSync('npm run --silent tolgee:start', { stdio: 'inherit' });
  } else {
    console.log(`Using alternative backend: ${process.env.TOLGEE_TEST_BACKEND_URL}`);
    console.log('Skipping Docker backend startup');
  }
};
