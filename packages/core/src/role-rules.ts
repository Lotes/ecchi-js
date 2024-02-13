import { BitmaskFactory } from "./bitmasks.js";
import { TypeBase } from "./common.js";
import { Condition } from "./conditions.js";
import { TypesBase } from "./reflection.js";
import { ActionsOf, SubjectActionsBase } from "./subject-actions.js";

export type RoleRule<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> = {
  conditions?: Condition<TUser, TSubject>[];
  kind: "allow" | "forbid";
  actions: TActions[];
}

export type RoleRulesBase<
  TUser extends TypeBase,
  TTypes extends TypesBase,
  TSubjectActions extends SubjectActionsBase<TTypes>
> 
  = Partial<{
    [S in keyof TSubjectActions]: RoleRule<TUser, TTypes[TSubjectActions[S][0]], ActionsOf<TTypes, TSubjectActions, S>>[]
  }>;

export class RoleRules<
  TUser extends TypeBase,
  TTypes extends TypesBase,
  TSubjectActions extends SubjectActionsBase<TTypes>
> {
  constructor(
    private readonly subjectActions: TSubjectActions,
    private readonly roleRules: RoleRulesBase<TUser, TTypes, TSubjectActions>
  ) {
  }
}