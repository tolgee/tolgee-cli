import { debug } from './logger.js';

/**
 Compares two semantic versions (e.g., "3.143.0" vs "3.142.0")
 Returns true if version1 >= version2
*/
export function isVersionAtLeast(required: string, current: string): boolean {
  debug(`Checking that server version ${current} is at least ${required}`);

  if (current === '??') {
    // local build, lets assume it's supported
    return true;
  }

  // Strip optional 'v' prefix from both versions
  const cleanRequired = required.startsWith('v') ? required.slice(1) : required;
  const cleanServerVersion = current.startsWith('v')
    ? current.slice(1)
    : current;

  const requiredParts = cleanRequired.split('.').map(Number);
  const currentParts = cleanServerVersion.split('.').map(Number);

  const maxLength = Math.max(requiredParts.length, currentParts.length);

  for (let i = 0; i < maxLength; i++) {
    const requiredPart = requiredParts[i] || 0;
    const currentPart = currentParts[i] || 0;

    if (currentPart > requiredPart) return true;
    if (currentPart < requiredPart) return false;
  }

  return true;
}
