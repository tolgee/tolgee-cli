import { components } from '../client/internal/schema.generated.js';
import ansi from 'ansi-colors';
import { warn } from './logger.js';
import { printKey } from '../commands/sync/syncUtils.js';

type SimpleKeyResult = components['schemas']['SimpleKeyResult'];

export function printFailedKeys(keys: SimpleKeyResult[], color = ansi.yellow) {
  console.log('');
  warn('Some keys cannot be updated:');
  keys.forEach((key) => {
    printKey({ keyName: key.name, namespace: key.namespace }, undefined, color);
  });
  console.log('');
}
