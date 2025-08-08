import { components } from '../client/internal/schema.generated.js';
import ansi from 'ansi-colors';
import { warn } from './logger.js';
import { printKey } from '../commands/sync/syncUtils.js';

type SimpleImportConflictResult =
  components['schemas']['SimpleImportConflictResult'];

export function printUnresolvedConflicts(
  keys: SimpleImportConflictResult[],
  color = ansi.yellow
) {
  console.log('');
  warn('Some keys cannot be updated:');
  keys.forEach((c) => {
    printKey(
      { keyName: c.keyName, namespace: c.keyNamespace },
      undefined,
      color,
      c.isOverridable ? '(overridable)' : ''
    );
  });
  console.log('');
}
