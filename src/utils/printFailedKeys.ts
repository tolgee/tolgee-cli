import { components } from '../client/internal/schema.generated.js';
import ansi from 'ansi-colors';
import { PartialKey } from '../commands/sync/syncUtils.js';

type SimpleImportConflictResult =
  components['schemas']['SimpleImportConflictResult'];

export function renderKey(key: PartialKey, note?: string) {
  const colorFunc = ansi.yellow;
  const namespace = key.namespace
    ? ` ${ansi.italic(`(namespace: ${key.namespace})`)}`
    : '';
  const renderedNote = note ? ` ${note}` : '';
  return `${colorFunc(`${key.keyName}`)}${namespace}${renderedNote}`;
}

export function getUnresolvedConflictsMessage(
  translations: SimpleImportConflictResult[],
  isError: boolean
) {
  const someOverridable = Boolean(translations.find((c) => c.isOverridable));
  const result = [''];

  result.push(`🟡 Some translations cannot be updated:`);
  translations.forEach((c) => {
    result.push(
      renderKey(
        { keyName: c.keyName, namespace: c.keyNamespace },
        `${c.language}` + (c.isOverridable ? ' (overridable)' : '')
      )
    );
  });
  result.push('');
  if (someOverridable) {
    result.push(
      'HINT: Overridable translations can be updated with the `--override-mode ALL`'
    );
    result.push('');
  }
  return result.join('\n');
}

export function printUnresolvedConflicts(
  translations: SimpleImportConflictResult[],
  isError: boolean
) {
  console.log(getUnresolvedConflictsMessage(translations, isError));
}
