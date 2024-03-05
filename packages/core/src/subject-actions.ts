import { Bitmask, BitmaskFactory } from "./bitmasks.js";
import { NestedSetElement, isSubTreeOf } from "./common.js";
import { TypesBase } from "./reflection.js";

export type NestedActionElement = [NestedSetElement, number];
export type ActionMasks<TAction extends string> = {[A in TAction]: Bitmask<A>};

export type AccessRuleMode = "allow" | "forbid";

export class SubjectActions<TAction extends string> {
  private reverseMap: Map<number, TAction> = new Map();
  private maskFactory: BitmaskFactory<TAction>;

  constructor(private readonly actions: Record<TAction, NestedActionElement>) {
    for(const action in actions) {
      this.reverseMap.set(actions[action][1], action);
    }
    const actionMap = new Map<TAction, number>();
    for (const [action, element] of Object.entries(this.actions)) {
      actionMap.set(action as TAction, (element as NestedActionElement)[1]);
    }
    this.maskFactory = new BitmaskFactory(actionMap);
  }
  private getActionParentsAndSelf(action: TAction): TAction[] {
    return Object.keys(this.actions)
          .filter((otherAction) => this.isSubActionOf(otherAction as TAction, action)) as TAction[]
  }
  private getActionChildrenAndSelf(action: TAction): TAction[] {
    return Object.keys(this.actions)
          .filter((otherAction) => this.isSubActionOf(action, otherAction as TAction)) as TAction[]
  }
  private isSubActionOf<T1 extends TAction, T2 extends TAction>(sub: T1, sup: T2): boolean {
    return isSubTreeOf(this.actions[sub][0], this.actions[sup][0]);
  }
  public createMask(mode: AccessRuleMode, ...actions: TAction[]): Bitmask<TAction> {
    const allConnected = mode === "allow"
      ? actions.flatMap((action) => this.getActionParentsAndSelf(action))
      : actions.flatMap((action) => this.getActionChildrenAndSelf(action))
      ;
    const normalized = [...new Set<TAction>(allConnected)];
    return this.maskFactory.createMask(...normalized);
  }
}

export type SubjectActionsBase<TTypes extends TypesBase> = Record<string, [keyof TTypes, SubjectActions<any>]>;
export type ActionsOf<TTypes extends TypesBase, TSubjectActions extends SubjectActionsBase<TTypes>, TKey extends keyof TSubjectActions> = TSubjectActions[TKey][1] extends SubjectActions<infer TAction> ? TAction : never;