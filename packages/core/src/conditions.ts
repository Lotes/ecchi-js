export type Obj = Record<number, unknown>;
export type Factory<Context, Dependency> = (ctx: Context) => Dependency;

export type ExpressionsModule<Context extends Obj = []> = {
  [I in keyof Context]: Factory<Context, Context[I]>;
}

export function memoize<Context extends Obj = []>(module: ExpressionsModule<Context>, keys: unknown[], cache: Map<string, Context>): Context {
  const hash = JSON.stringify(keys);
  if (cache.has(hash)) {
      return cache.get(hash)!;
  }
  const get = (obj: any, prop: PropertyKey, proxy: any) => {
    const ctr = proxy;
    if (prop in obj) {
        return obj[prop];
    } else if (prop in module) {
        obj[prop] = undefined;
        const val = module[prop.valueOf() as number] as Function;
        return obj[prop] = val(ctr);
    } else {
        return undefined;
    }
  };
  const proxy: Context = new Proxy([], {
      deleteProperty: () => false,
      get,
      getOwnPropertyDescriptor: (target, prop) => (get(target, prop, proxy), Object.getOwnPropertyDescriptor(target, prop)),
      has: (_, prop) => prop in module,
      ownKeys: () => Reflect.ownKeys(module)
  });
  cache.set(hash, proxy);
  return proxy;
}