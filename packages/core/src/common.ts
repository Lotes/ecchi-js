export type AccessRuleMode = 'allow' | 'forbid';
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

export function merge(
  allow: [number, number],
  forbid: [number, number],
  roles: string[],
  handlers: Record<string, (() => [boolean, number[]])[]>
) {
  const mask = roles
    .flatMap((role) => handlers[role])
    .map((item) => item())
    .filter(([condition, _]) => condition)
    .map(([_, mask]) => mask)
    .reduce((lhs, rhs) => or(lhs, rhs));
  return (
    mask.length > 0 &&
    (mask[forbid[0]] & forbid[1]) === 0 &&
    (mask[allow[0]] & allow[1]) !== 0
  );
}
