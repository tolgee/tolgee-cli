import { join } from 'path';
import { readFileSync } from 'fs';

const packageJson = join(__dirname, '..', '..', 'package.json');
const pkg = readFileSync(packageJson, 'utf8');

export const VERSION = JSON.parse(pkg).version;
export const USER_AGENT = `Tolgee-CLI/${VERSION} (+https://github.com/tolgee/tolgee-cli)`;

export const KEY_REGEX = /[A-Za-z0-9_\-\s.:]+/;
