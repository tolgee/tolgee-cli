export const getStackTrace = () => {
  const obj = {} as any;
  Error.captureStackTrace(obj, getStackTrace);
  const stack = obj.stack as string;
  const parts = stack.split('\n');
  return parts.slice(2).join('\n');
};
