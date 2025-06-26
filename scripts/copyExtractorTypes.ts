import { copyFile } from 'fs/promises';
import path from 'path';

const cwd = process.cwd();
{
  const sourcePath = path.join(cwd, 'dist-types/extractor/index.d.ts');
  const destinationPath = path.join(cwd, 'extractor.d.ts');

  await copyFile(sourcePath, destinationPath);
}

{
  const sourcePath = path.join(cwd, 'src/schema.d.ts');
  const destinationPath = path.join(cwd, 'dist-types/schema.d.ts');

  await copyFile(sourcePath, destinationPath);
}
