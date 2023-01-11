import type { AllKeys } from '../../client/project';
import { type FilteredKeys, type Key, NullNamespace } from '../../extractor';
import ansi from 'ansi-colors';

export type PartialKey = { keyName: string; namespace?: string };

export type ComparatorResult = {
  added: Key[];
  removed: Array<{ id: number; keyName: string; namespace?: string }>;
};

/**
 * Prints information about a key, with coloring and formatting.
 *
 * @param key The key to print.
 * @param type Whether this is an addition or a removal.
 */
export function printKey(key: PartialKey, type: 'added' | 'removed') {
  const namespace = key.namespace
    ? ` ${ansi.italic(`(namespace: ${key.namespace})`)}`
    : '';

  if (type === 'added') {
    console.log(`${ansi.green(`+ ${key.keyName}`)}${namespace}`);
  } else {
    console.log(`${ansi.red(`- ${key.keyName}`)}${namespace}`);
  }
}

/**
 * Compares local and remote keys to detect added and deleted keys.
 * **Warning**: `local` will be modified as a side-effect!
 *
 * @param local Local keys.
 * @param remote Remote keys.
 * @returns A list of added and removed keys.
 */
export function compareKeys(
  local: FilteredKeys,
  remote: AllKeys
): ComparatorResult {
  const result: ComparatorResult = { added: [], removed: [] };

  // Deleted keys
  for (const remoteKey of remote) {
    const namespace = remoteKey.namespace || NullNamespace;
    const keyExists = local[namespace]?.delete(remoteKey.name);
    if (!keyExists) {
      result.removed.push({
        id: remoteKey.id,
        keyName: remoteKey.name,
        namespace: remoteKey.namespace || undefined,
      });
    }
  }

  // Added keys
  const namespaces = [...Object.keys(local), NullNamespace] as const;
  for (const namespace of namespaces) {
    if (local[namespace].size) {
      for (const [keyName, defaultValue] of local[namespace].entries()) {
        result.added.push({
          keyName: keyName,
          namespace: namespace === NullNamespace ? undefined : namespace,
          defaultValue: defaultValue || undefined,
        });
      }
    }
  }

  return result;
}
