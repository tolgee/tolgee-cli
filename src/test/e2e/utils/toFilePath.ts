import { fileURLToPath } from 'url';

export function fileURLToPathSlash(url: URL) {
  return fileURLToPath(url).replace(/\\/g, '/');
}
