import { NestedSetElement, TypeBase, isSubTreeOf } from "./common.js";

export type TypeNames<TTypes extends Record<string, TypeBase>> = keyof TTypes;

export class Reflection<TTypes extends Record<string, TypeBase>> {
  constructor(private readonly inheritanceTree: Record<TypeNames<TTypes>, NestedSetElement>) {}
  isSubTypeOf<T1 extends TypeBase, T2 extends TypeBase>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.inheritanceTree[sub.$type], this.inheritanceTree[sup.$type]);
  }
}