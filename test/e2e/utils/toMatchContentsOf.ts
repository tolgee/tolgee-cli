import { join, extname } from 'path';
import { createHash } from 'crypto';
import { readdir, stat, readFile } from 'fs/promises';

async function recursiveReaddir(path: string, base: string = '') {
  const files: Record<string, string> = {};

  for (const file of await readdir(path)) {
    const filePath = join(path, file);
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      const directoryFiles = await recursiveReaddir(
        filePath,
        `${base}${file}/`
      );

      Object.assign(files, directoryFiles);
    } else {
      const contents = await readFile(filePath);

      // Read in a sort-of-smart way to not nitpick on file format, key orders, ...
      switch (extname(filePath)) {
        case '.json':
          files[`${base}${file}`] = JSON.parse(contents.toString('utf8'));
          break;
        default: {
          const hash = createHash('sha256').update(contents).digest('hex');
          files[`${base}${file}`] = `sha256: ${hash}`;
          break;
        }
      }
    }
  }

  return files;
}

expect.extend({
  async toMatchContentsOf(actual: string, expected: string) {
    const actualFilesAndContents = await recursiveReaddir(actual);
    const expectedFilesAndContents = await recursiveReaddir(expected);

    const actualFiles = Object.keys(actualFilesAndContents);
    const actualContents = Object.values(actualFilesAndContents);
    const expectedFiles = Object.keys(expectedFilesAndContents);
    const expectedContents = Object.values(expectedFilesAndContents);

    const filesMatch = this.equals(actualFiles, expectedFiles);
    const hashesMatch = this.equals(actualContents, expectedContents);
    if (!filesMatch || !hashesMatch) {
      const msg =
        !filesMatch && !hashesMatch
          ? 'Files and their contents do not match'
          : !filesMatch
          ? 'Files contained in the folder do not match'
          : 'File contents do not match';

      return {
        pass: false,
        message: () =>
          `${msg}\n` +
          this.utils.printDiffOrStringify(
            expectedFilesAndContents,
            actualFilesAndContents,
            'expected',
            'found',
            this.expand !== false
          ),
      };
    }

    return {
      pass: true,
      message: () => `expected folders to NOT contain the same files`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchContentsOf(expected: string): R;
    }
  }
}
