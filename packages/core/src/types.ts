//left, right
export type NestedSetElement = [number, number];
export type TypeBase = Record<string, any> & { '$type': string };
export type TypeNames<TTypes extends Record<string, TypeBase>> = keyof TTypes;

function isSubTreeOf(sub: NestedSetElement, sup: NestedSetElement): boolean {
  return sub[0] >= sup[0] && sub[1] <= sup[1];
}

export class Reflection<TTypes extends Record<string, TypeBase>> {
  constructor(private readonly inheritanceTree: Record<TypeNames<TTypes>, NestedSetElement>) {}
  isSubTypeOf<T1 extends TypeBase, T2 extends TypeBase>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.inheritanceTree[sub.$type], this.inheritanceTree[sup.$type]);
  }
}

//left, right, index, condition
export type NestedActionElement<TUser extends TypeBase, TSubject extends TypeBase> = [NestedSetElement, number, Condition<TUser, TSubject>|undefined];
export class Subject<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> {
  constructor(private readonly actions: Record<TActions, NestedActionElement<TUser, TSubject>>) {}
  isSubActionOf<T1 extends TActions, T2 extends TActions>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.actions[sub][0], this.actions[sup][0]);
  }
}
export type Condition<TUser, TSubject> = (user: TUser, subject: TSubject) => boolean;