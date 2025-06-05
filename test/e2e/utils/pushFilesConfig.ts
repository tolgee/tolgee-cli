import { FileMatch } from '#cli/schema.js';
import { fileURLToPath } from 'url';

export function pushFilesConfig(base: URL, namespaces: string[] = ['']) {
  const result: FileMatch[] = [];

  for (const ns of namespaces) {
    result.push({
      path: fileURLToPath(new URL(`./${ns}/en.json`, base)),
      language: 'en',
      namespace: ns,
    });
    result.push({
      path: fileURLToPath(new URL(`./${ns}/fr.json`, base)),
      language: 'fr',
      namespace: ns,
    });
  }
  return result;
}
