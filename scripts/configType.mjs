import { writeFileSync } from 'fs';
import { compileFromFile } from 'json-schema-to-typescript';

// compile from file
compileFromFile('schema.json', {}).then((ts) =>
  writeFileSync('./src/schema.d.ts', ts)
);
