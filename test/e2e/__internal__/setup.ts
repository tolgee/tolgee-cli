import { execSync } from 'node:child_process';
export default () => {
  execSync('npm run --silent build', { stdio: 'inherit' });
  execSync('npm run --silent tolgee:start', { stdio: 'inherit' });
};
