import { Argument } from 'commander';

export const FILE_PATTERNS = new Argument(
  '[patterns...]',
  'File glob patterns to include (hint: make sure to escape it in quotes, or your shell might attempt to unroll some tokens like *)'
);
