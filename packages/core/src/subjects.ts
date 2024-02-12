import { TypeBase, NestedSetElement, isSubTreeOf } from "./common.js";

export type NestedActionElement<TUser extends TypeBase, TSubject extends TypeBase> = [NestedSetElement, number];
export class Subject<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> {
  constructor(private readonly actions: Record<TActions, NestedActionElement<TUser, TSubject>>) {}
  isSubActionOf<T1 extends TActions, T2 extends TActions>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.actions[sub][0], this.actions[sup][0]);
  }
}