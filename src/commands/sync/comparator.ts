import type { AllKeys } from '../../client/project';
import { type FilteredKeys, type Key, NullNamespace } from '../../extractor';
import { WarningMessages, emitGitHubWarning } from '../../extractor/warnings';

export type ComparatorResult = {
  added: Key[];
  removed: Array<{ id: number; keyName: string; namespace?: string }>;
};

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
