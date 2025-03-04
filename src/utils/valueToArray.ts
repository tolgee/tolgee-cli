export function valueToArray<T>(
  value: T[] | T | undefined | null
): T[] | undefined | null {
  if (Array.isArray(value) || value === undefined || value == null) {
    return value as any;
  } else {
    return [value];
  }
}
