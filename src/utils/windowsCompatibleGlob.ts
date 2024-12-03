import { glob, GlobOptionsWithFileTypesUnset } from 'glob';

export const windowsCompatibleGlob = (
  pattern: string | string[],
  options?: GlobOptionsWithFileTypesUnset | undefined
) => {
  return glob(pattern, {
    ...options,
    windowsPathsNoEscape: process.platform === 'win32',
  });
};
