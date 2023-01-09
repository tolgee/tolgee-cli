import { join } from 'path';
import { readFileSync } from 'fs';
import getConfigPath from './utils/configPath';

const packageJson = join(__dirname, '..', 'package.json');
const pkg = readFileSync(packageJson, 'utf8');

export const CONFIG_PATH = getConfigPath();

export const VERSION = JSON.parse(pkg).version;
export const USER_AGENT = `Tolgee-CLI/${VERSION} (+https://github.com/tolgee/tolgee-cli)`;

export const DEFAULT_API_URL = new URL('https://app.tolgee.io');

export const API_KEY_PAT_PREFIX = 'tgpat_';
export const API_KEY_PAK_PREFIX = 'tgpak_';

export const SDKS = <const>['react'];
