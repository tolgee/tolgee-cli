import { join, extname } from 'path';
import { createHash } from 'crypto';
import { readdir, stat, readFile } from 'fs/promises';
import tree from 'tree-cli';

async function recursiveReaddir(path: string, base = '') {
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

async function getStructure(path: string) {
  return (
    (await tree({ base: path, l: 100, f: true })).report
      .split('\n')
      // remove first line with folder name and last few lines with statistics
      .slice(1, -4)
      .join('\n')
  );
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
  async toMatchStructureOf(actual: string, expected: string) {
    const actualStructure = await getStructure(actual);
    const expectedStructure = await getStructure(expected);

    console.log(actualStructure);

    if (actualStructure !== expectedStructure) {
      return {
        pass: false,
        message: () =>
          `Structure doesn't match:\n` +
          this.utils.printDiffOrStringify(
            expectedStructure,
            actualStructure,
            'expected',
            'found',
            this.expand !== false
          ),
      };
    }
    return {
      pass: true,
      message: () => `structure doesn't match`,
    };
  },
  async toMatchStructure(actual: string, expected: string) {
    const actualStructure = (await getStructure(actual)).trim();
    const expectedStructure = expected.trim();

    if (actualStructure !== expectedStructure) {
      return {
        pass: false,
        message: () =>
          `Structure doesn't match\n:` +
          this.utils.printDiffOrStringify(
            expectedStructure,
            actualStructure,
            'expected',
            'found',
            this.expand !== false
          ),
      };
    }
    return {
      pass: true,
      message: () => `structure doesn't match`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchContentsOf(expected: string): Promise<R>;
      toMatchStructureOf(expected: string): Promise<R>;
      toMatchStructure(expected: string): Promise<R>;
    }
  }
}
