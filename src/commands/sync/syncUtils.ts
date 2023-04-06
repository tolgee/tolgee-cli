import type { AllKeys } from '../../client/project';
import type { Key } from '../../extractor';
import { type FilteredKeys, NullNamespace } from '../../extractor/runner';
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
 * @param deletion True if the key is about to be deleted.
 */
export function printKey(key: PartialKey, deletion: boolean) {
  const namespace = key.namespace
    ? ` ${ansi.italic(`(namespace: ${key.namespace})`)}`
    : '';

  if (deletion) {
    console.log(`${ansi.red(`- ${key.keyName}`)}${namespace}`);
  } else {
    console.log(`${ansi.green(`+ ${key.keyName}`)}${namespace}`);
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
  const namespaces = [NullNamespace, ...Object.keys(local).sort()] as const;
  for (const namespace of namespaces) {
    if (namespace in local && local[namespace].size) {
      const keys = local[namespace];
      const keyNames = Array.from(local[namespace].keys()).sort();
      for (const keyName of keyNames) {
        result.added.push({
          keyName: keyName,
          namespace: namespace === NullNamespace ? undefined : namespace,
          defaultValue: keys.get(keyName) || undefined,
        });
      }
    }
  }

  // Sort keys
  // This is only necessary for unused keys, because the added keys are sorted directly as they're added.
  result.removed.sort((a, b) => {
    if (a.namespace === b.namespace) {
      return a.keyName > b.keyName ? 1 : a.keyName < b.keyName ? -1 : 0;
    }

    if (!a.namespace && b.namespace) return -1;
    if (a.namespace && !b.namespace) return 1;
    return a.namespace! > b.namespace!
      ? 1
      : a.namespace! < b.namespace!
      ? -1
      : 0;
  });

  return result;
}
