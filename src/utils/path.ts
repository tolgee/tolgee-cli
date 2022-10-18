import { homedir } from 'os';
import { resolve } from 'path';

export function getConfigPath() {
  switch (process.platform) {
    case 'win32':
      return resolve(process.env.APPDATA!);
    case 'darwin':
      return resolve(homedir(), 'Library', 'Application Support');
    default:
      return process.env.XDG_CONFIG_HOME
        ? resolve(process.env.XDG_CONFIG_HOME)
        : resolve(homedir(), '.config');
  }
}
