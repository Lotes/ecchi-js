export type NestedSetElement = [number, number];

export function isSubTreeOf(sub: NestedSetElement, sup: NestedSetElement): boolean {
  return sub[0] >= sup[0] && sub[1] <= sup[1];
}

export type TypeBase = Record<string, any> & { '$type': string };

export function assertUnreachable(_: never): never {
  throw new Error('Error! The input value was not handled.');
}

export function or(lhs: number[], rhs: number[]): number[] {
  return lhs.map((value, index) => value | rhs[index]);
}
