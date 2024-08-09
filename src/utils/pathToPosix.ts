import path from 'path';

export function pathToPosix(input: string) {
  return input.replaceAll(path.sep, path.posix.sep);
}
