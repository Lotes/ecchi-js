import { TypeBase, NestedSetElement, isSubTreeOf } from "./common.js";

export type NestedActionElement<TUser extends TypeBase, TSubject extends TypeBase> = [NestedSetElement, number];
export class Subject<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> {
  private reverseMap: Map<number, TActions> = new Map();
  constructor(private readonly actions: Record<TActions, NestedActionElement<TUser, TSubject>>) {
    for(const action in actions) {
      this.reverseMap.set(actions[action][1], action);
    }
  }
  get actionCount(): number {
    return Object.keys(this.actions).length;
  }
  toActionIndex(action: TActions): number {
    return this.actions[action][1];
  }
  fromActionIndex(actionIndex: number): TActions {
    return this.reverseMap.get(actionIndex)!;
  }
  getActionParentsAndSelf(action: TActions): TActions[] {
    return Object.keys(this.actions)
          .filter((otherAction) => this.isSubActionOf(otherAction as TActions, action)) as TActions[]
  }
  getActionChildrenAndSelf(action: TActions): TActions[] {
    return Object.keys(this.actions)
          .filter((otherAction) => this.isSubActionOf(action, otherAction as TActions)) as TActions[]
  }
  isSubActionOf<T1 extends TActions, T2 extends TActions>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.actions[sub][0], this.actions[sup][0]);
  }
}

export type ActionsOfSubject<TUser extends TypeBase, TSubjects extends Record<string, Subject<TUser, any, string>>, TKey extends keyof TSubjects> = TSubjects[TKey] extends Subject<TUser, any, infer TActions> ? TActions : never;
export type TypeOfSubject<TUser extends TypeBase, TSubjects extends Record<string, Subject<TUser, any, string>>, TKey extends keyof TSubjects> = TSubjects[TKey] extends Subject<TUser, infer TSubject, any> ? TSubject : never;