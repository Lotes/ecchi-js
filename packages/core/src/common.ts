export type NestedSetElement = [number, number];

export function isSubTreeOf(sub: NestedSetElement, sup: NestedSetElement): boolean {
  return sub[0] >= sup[0] && sub[1] <= sup[1];
}

export type TypeBase = Record<string, any> & { '$type': string };

export function memoize(func: Function) {
  const cache: Record<string, any> = {};
  
  return function(this: any, ...args: any[]) {
    const key = JSON.stringify(args);
    
    if (cache[key]) {
      return cache[key];
    }
    
    const result = func.apply(this, args);
    cache[key] = result;
    return result;
  };
}

export function assertUnreachable(_: never): never {
  throw new Error('Error! The input value was not handled.');
}
