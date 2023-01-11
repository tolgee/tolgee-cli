import type { ZipFile, Entry } from 'yauzl';
import type { Blob } from 'buffer';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fromBuffer } from 'yauzl';

const ZIP_PARSER_OPTS = {
  strictFileNames: true,
  decodeStrings: true,
  lazyEntries: true,
};

function dumpFile(zip: ZipFile, entry: Entry, dest: string) {
  zip.openReadStream(entry, (err, stream) => {
    if (err) throw err;

    const writeStream = createWriteStream(dest);
    stream.pipe(writeStream);

    // Unlock reading loop
    stream.on('end', () => zip.readEntry());
  });
}

/**
 * Unzips a ZIP blob to a destination on disk.
 *
 * @param zipBlob The ZIP blob
 * @param dest The destination path
 */
export function unzipBuffer (zipBlob: Blob, dest: string) {
  return new Promise<void>((resolve, reject) => {
    zipBlob.arrayBuffer().then((buffer) => {
      const nodeBuffer = Buffer.from(buffer)
      fromBuffer(nodeBuffer, ZIP_PARSER_OPTS, (err, zip) => {
        if (err) {
          return reject(err)
        }

        resolve(unzip(zip, dest))
      })
    })
  })
}

/**
 * Unzips a ZIP file loaded in memory to a destination on disk.
 *
 * @param file The ZIP file
 * @param dest The destination path
 */
export function unzip(zip: ZipFile, dest: string) {
  // Enforce expected & security options.
  // Lazy entries is what this reader is based upon.
  // Decode strings ensures file paths are sanitized by yazul
  // and does not present any security threat to the machine.
  if (!zip.lazyEntries || !zip.decodeStrings) {
    throw new TypeError(
      'Invalid ZIP file: lazyEntries and decodeStrings both must be set to true.'
    );
  }

  return new Promise<void>((resolve, reject) => {
    zip.on('error', reject);
    zip.on('end', resolve);

    // There is no mechanism for zip files to contain directories
    // by standards, and implementations diverge. Some make an explicit
    // directory entry (ending with /), some don't make any specific treatment.
    // The "safest" way is to check the path on files and create them as necessary.
    const seenDirectories = new Set<string>([dest]);

    zip.readEntry();
    zip.on('entry', (entry: Entry) => {
      if (entry.fileName.endsWith('/')) {
        zip.readEntry();
        return;
      }

      const entryPath = join(dest, entry.fileName);

      // Handle directory creation
      const entryDirName = dirname(entryPath);
      if (!seenDirectories.has(entryDirName)) {
        mkdir(entryDirName, { recursive: true }).then(() =>
          dumpFile(zip, entry, entryPath)
        );
      } else {
        dumpFile(zip, entry, entryPath);
      }
    });
  });
}
