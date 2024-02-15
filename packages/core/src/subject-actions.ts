import { Bitmask, BitmaskFactory } from "./bitmasks.js";
import { NestedSetElement, isSubTreeOf } from "./common.js";
import { TypesBase } from "./reflection.js";

export type NestedActionElement = [NestedSetElement, number];
export type ActionMasks<TAction extends string> = {[A in TAction]: Bitmask<A>};

export class SubjectActions<TAction extends string> {
  private reverseMap: Map<number, TAction> = new Map();
  private maskFactory: BitmaskFactory<TAction>;
  public allowedMasks: ActionMasks<TAction>;
  public forbiddenMasks: ActionMasks<TAction>;

  constructor(private readonly actions: Record<TAction, NestedActionElement>) {
    for(const action in actions) {
      this.reverseMap.set(actions[action][1], action);
    }
    this.maskFactory = new BitmaskFactory(this.actionMap);
    this.allowedMasks = {} as any;
    this.forbiddenMasks = {} as any;
    for (const [action] of this.actionMap) {
      this.allowedMasks[action] = this.maskFactory.createMask(...this.getActionParentsAndSelf(action)) as any;
      this.forbiddenMasks[action] = this.maskFactory.createMask(...this.getActionChildrenAndSelf(action)) as any;  
    }
  }
  private get actionMap(): Map<TAction, number> {
    const result = new Map<TAction, number>();
    for (const [action, element] of Object.entries(this.actions)) {
      result.set(action as TAction, (element as NestedActionElement)[1]);
    }
    return result;
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
}

export type SubjectActionsBase<TTypes extends TypesBase> = Record<string, [keyof TTypes, SubjectActions<any>]>;
export type ActionsOf<TTypes extends TypesBase, TSubjectActions extends SubjectActionsBase<TTypes>, TKey extends keyof TSubjectActions> = TSubjectActions[TKey][1] extends SubjectActions<infer TAction> ? TAction : never;