import { InvalidArgumentError } from 'commander';

export function parseExtraHeadersArg(value: string): Record<string, string> {
  const trimmed = value.trim();
  if (!trimmed) return {};

  const out: Record<string, string> = {};
  for (const pair of trimmed.split(',')) {
    const segment = pair.trim();
    if (!segment) continue;
    const idx = segment.indexOf('=');
    if (idx <= 0) {
      throw new InvalidArgumentError(
        `Invalid extra header "${segment}". Use Name=Value.`
      );
    }
    out[segment.slice(0, idx).trim()] = segment.slice(idx + 1).trim();
  }
  return out;
}
