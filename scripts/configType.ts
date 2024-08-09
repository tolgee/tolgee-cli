import { writeFileSync } from 'fs';
import { compileFromFile } from 'json-schema-to-typescript';

// compile from file
const ts = await compileFromFile('schema.json', {
  additionalProperties: false,
});
writeFileSync('./src/schema.d.ts', ts);
