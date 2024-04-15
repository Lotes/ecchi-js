import { Cache } from "./cache.js";

export type Obj = Record<number, unknown>;

export type CommonModule<Context extends Obj = []> = {
  [I in keyof Context]: (common: Context) => Context[I];
};

export type SubjectModule<
  CommonCtx extends Obj = [],
  SubjectCtx extends Obj = []
> = {
  [I in keyof SubjectCtx]: (
    common: CommonCtx,
    subject: SubjectCtx
  ) => SubjectCtx[I];
};

export function cacheCommonExpressions<Context extends Obj = []>(
  module: CommonModule<Context>,
  keys: unknown[],
  cache: Cache
): Context {
  const hash = JSON.stringify({type: 'common', keys});
  if (cache.has(hash)) {
    return cache.get(hash)! as Context;
  }
  const get = (obj: any, prop: PropertyKey, proxy: any) => {
    const ctr = proxy;
    if (prop in obj) {
      return obj[prop];
    } else if (prop in module) {
      obj[prop] = undefined;
      const val = module[prop.valueOf() as number] as (
        common: Context
      ) => unknown;
      return (obj[prop] = val(ctr));
    } else {
      return undefined;
    }
  };
  const proxy: Context = new Proxy([], {
    get,
    getOwnPropertyDescriptor: (target, prop) => (
      get(target, prop, proxy), Object.getOwnPropertyDescriptor(target, prop)
    ),
  });
  cache.set(hash, proxy);
  return proxy;
}

export function cacheSubjectExpressions<
  CommonContext extends Obj = [],
  SubjectContext extends Obj = []
>(
  commonProxy: CommonContext,
  subject: SubjectModule<CommonContext, SubjectContext>,
  keys: unknown[],
  cache: Cache
): SubjectContext {
  const hash = JSON.stringify({type:'subject',keys});
  if (cache.has(hash)) {
    return cache.get(hash)! as SubjectContext;
  }
  const get = (obj: any, prop: PropertyKey, proxy: any) => {
    const ctr = proxy;
    if (prop in obj) {
      return obj[prop];
    } else if (prop in subject) {
      obj[prop] = undefined;
      const val = subject[prop.valueOf() as number] as (
        common: CommonContext,
        suject: SubjectContext
      ) => unknown;
      return (obj[prop] = val(commonProxy, ctr));
    } else {
      return undefined;
    }
  };
  const proxy: SubjectContext = new Proxy([], {
    get,
    getOwnPropertyDescriptor: (target, prop) => (
      get(target, prop, proxy), Object.getOwnPropertyDescriptor(target, prop)
    ),
  });
  cache.set(hash, proxy);
  return proxy;
}
