import { homedir } from 'os';
import { resolve } from 'path';

export default function getConfigPath() {
  switch (process.platform) {
    case 'win32':
      return resolve(process.env.APPDATA!, 'tolgee');
    case 'darwin':
      return resolve(homedir(), 'Library', 'Application Support', 'tolgee');
    default:
      return process.env.XDG_CONFIG_HOME
        ? resolve(process.env.XDG_CONFIG_HOME, 'tolgee')
        : resolve(homedir(), '.config', 'tolgee');
  }
}
