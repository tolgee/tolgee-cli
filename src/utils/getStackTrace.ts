export const getStackTrace = () => {
  if (typeof Error.captureStackTrace === 'function') {
    const obj = {} as { stack?: string };
    Error.captureStackTrace(obj, getStackTrace);
    return obj.stack ?? '';
  }
  return new Error().stack ?? '';
};
