import { Bitmask } from "./bitmasks.js";
import { TypeBase } from "./common.js";
import { Condition } from "./conditions.js";
import { TypesBase } from "./reflection.js";
import { RoleRulesBase } from "./role-rules.js";
import { ActionsOf, SubjectActionsBase } from "./subject-actions.js";

export type Claim<
  TTypes extends TypesBase,
  TEnvironment extends TypeBase,
  TSubjectActions extends SubjectActionsBase<TTypes>,
  TUser extends TypeBase,
  TAction extends string
> = [keyof TSubjectActions, Condition<TUser, TEnvironment, TSubjectActions[]>, Bitmask<TAction>];

export type Claims<
  TTypes extends TypesBase,
  TEnvironment extends TypeBase,
  TSubjectActions extends SubjectActionsBase<TTypes>,
  TUser extends TypeBase
> = {
  [S in keyof TSubjectActions]: Claim<TTypes, TEnvironment, TSubjectActions, TUser, ActionsOf<TTypes, TSubjectActions, S>>[];
};

export class UserPermissions<
  TUser extends TypeBase,
  TEnvironment extends TypeBase,
  TTypes extends TypesBase,
  TSubjectActions extends SubjectActionsBase<TTypes>,
  TRoleRules extends RoleRulesBase<TUser, TEnvironment, TTypes, TSubjectActions>
> {
  private claims: Claims<TTypes, TEnvironment, TSubjectActions, TUser> = {} as any;
  private disclaims: Claims<TTypes, TEnvironment, TSubjectActions, TUser> = {} as any;
  constructor(
    public readonly user: TUser,
    public readonly types: TTypes,
    public readonly subjectActions: TSubjectActions,
    public readonly roleRules: TRoleRules
  ) {}
  allow(subject: keyof TSubjectActions, action: ActionsOf<TTypes, TSubjectActions, typeof subject>) {
    this.claims[subject].push([subject, () => true, this.subjectActions[subject][1].allowedMasks[action]] as any);
  }
  forbid(subject: keyof TSubjectActions, action: ActionsOf<TTypes, TSubjectActions, typeof subject>) {
    this.disclaims[subject].push([subject, () => true, this.subjectActions[subject][1].forbiddenMasks[action]] as any);
  }
  role(_role: keyof TRoleRules) {
    
  }
}