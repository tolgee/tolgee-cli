export type Deferred<T = any> = {
  promise: Promise<T>;
  resolve: (arg: T) => void;
  reject: (arg: any) => void;
};

export function createDeferred<T = any>(): Deferred<T> {
  const deferred: any = {};
  deferred.promise = new Promise((resolve, reject) => {
    Object.assign(deferred, { resolve: resolve, reject: reject });
  });

  return deferred as Deferred<T>;
}
