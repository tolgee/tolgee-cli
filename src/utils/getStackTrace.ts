export const getStackTrace = () => {
  const obj = {} as any;
  Error.captureStackTrace(obj, getStackTrace);
  return obj.stack as string;
};
