import { NestedSetElement, TypeBase, isSubTreeOf } from "./common.js";

export type TypesBase = Record<string, TypeBase>;
export type TypeNames<TTypes extends TypesBase> = keyof TTypes;

export class Reflection<TTypes extends TypesBase> {
  constructor(private readonly inheritanceTree: Record<TypeNames<TTypes>, NestedSetElement>) {}
  isSubTypeOfTyped<T1 extends TypeBase, T2 extends TypeBase>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.inheritanceTree[sub.$type], this.inheritanceTree[sup.$type]);
  }
  isSubTypeOf(sub: string, sup: string): boolean {
    return isSubTreeOf(this.inheritanceTree[sub], this.inheritanceTree[sup]);
  }
}