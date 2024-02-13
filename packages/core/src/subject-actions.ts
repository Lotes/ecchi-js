import { NestedSetElement, isSubTreeOf } from "./common.js";
import { TypesBase } from "./reflection.js";

export type NestedActionElement = [NestedSetElement, number];

export class SubjectActions<TAction extends string> {
  private reverseMap: Map<number, TAction> = new Map();
  constructor(private readonly actions: Record<TAction, NestedActionElement>) {
    for(const action in actions) {
      this.reverseMap.set(actions[action][1], action);
    }
  }
  get actionCount(): number {
    return Object.keys(this.actions).length;
  }
  toActionIndex(action: TAction): number {
    return this.actions[action][1];
  }
  fromActionIndex(actionIndex: number): TAction {
    return this.reverseMap.get(actionIndex)!;
  }
  getActionParentsAndSelf(action: TAction): TAction[] {
    return Object.keys(this.actions)
          .filter((otherAction) => this.isSubActionOf(otherAction as TAction, action)) as TAction[]
  }
  getActionChildrenAndSelf(action: TAction): TAction[] {
    return Object.keys(this.actions)
          .filter((otherAction) => this.isSubActionOf(action, otherAction as TAction)) as TAction[]
  }
  isSubActionOf<T1 extends TAction, T2 extends TAction>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.actions[sub][0], this.actions[sup][0]);
  }
}

export type SubjectActionsBase<TTypes extends TypesBase> = Record<string, [keyof TTypes, SubjectActions<any>]>;
export type ActionsOf<TTypes extends TypesBase, TSubjectActions extends SubjectActionsBase<TTypes>, TKey extends keyof TSubjectActions> = TSubjectActions[TKey][1] extends SubjectActions<infer TAction> ? TAction : never;