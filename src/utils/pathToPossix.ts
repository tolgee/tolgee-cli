import path from 'path';

export function pathToPossix(input: string) {
  return input.replaceAll(path.sep, path.posix.sep);
}
