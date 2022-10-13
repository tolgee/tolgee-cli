import type { ZipFile, Entry } from 'yauzl';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Unzips a ZIP file loaded in memory to a destination on disk.
 *
 * @param file The ZIP file
 * @param dest The destination path
 */
export function unzip(zip: ZipFile, dest: string) {
  if (!zip.lazyEntries || !zip.decodeStrings) {
    throw new TypeError(
      'Invalid ZIP file: lazyEntries and decodeStrings both must be set to true.'
    );
  }

  return new Promise<void>((resolve, reject) => {
    zip.on('error', reject);
    zip.on('end', resolve);

    zip.readEntry();
    zip.on('entry', (entry: Entry) => {
      // Security note: yauzl *does* sanitize the string and protects from path traversal thanks to decodeStrings.
      const entryPath = join(dest, entry.fileName);

      if (entry.fileName.endsWith('/')) {
        // Entry is a directory
        mkdir(entryPath).then(() => zip.readEntry());
        return;
      }

      zip.openReadStream(entry, (err, stream) => {
        if (err) return reject(err);
        const writeStream = createWriteStream(entryPath);
        stream.pipe(writeStream);

        // Once we're done, read the next entry
        stream.on('end', () => zip.readEntry());
      });
    });
  });
}
