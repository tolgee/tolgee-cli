import { FileMatch } from '#cli/schema.js';
import { fileURLToPath } from 'url';

export function pushFilesConfig(base: URL, namespaces: string[] = ['']) {
  const result: FileMatch[] = [];
  const sanitizedNamespaces = namespaces.map((ns) => {
    if (ns.includes('..') || ns.includes('/') || ns.includes('\\')) {
      throw new Error(
        `Invalid namespace: ${ns}. Namespaces cannot contain path separators or traversal sequences.`
      );
    }
    return ns;
  });

  for (const ns of sanitizedNamespaces) {
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
