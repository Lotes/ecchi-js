import { TypeBase } from "./common.js";
import { TypesBase } from "./reflection.js";
import { RoleRulesBase } from "./role-rules.js";
import { ActionsOf, SubjectActionsBase } from "./subject-actions.js";

export type UserClaims<TTypes extends TypesBase, TSubjectActions extends SubjectActionsBase<TTypes>> = Partial<{
  [S in keyof TSubjectActions]: ActionsOf<TTypes, TSubjectActions, S>[]
}>;

export class UserPermissions<
  TUser extends TypeBase,
  TTypes extends TypesBase,
  TSubjectActions extends SubjectActionsBase<TTypes>,
  TRoleRules extends RoleRulesBase<TUser, TTypes, TSubjectActions>
> {
  private claims: UserClaims<TTypes, TSubjectActions> = {};
  private disclaims: UserClaims<TTypes, TSubjectActions> = {};
  private roles: (keyof TRoleRules)[] = [];
  constructor(
    public readonly user: TUser,
    public readonly types: TTypes,
    public readonly subjectActions: TSubjectActions,
    public readonly roleRules: TRoleRules
  ) {}
  allow(subject: keyof TSubjectActions, action: ActionsOf<TTypes, TSubjectActions, typeof subject>) {
    if(!(subject in this.claims)) {
      this.claims[subject] = [];
    }
    this.claims[subject]!.push(action);
  }
  forbid(subject: keyof TSubjectActions, action: ActionsOf<TTypes, TSubjectActions, typeof subject>) {
    if(!(subject in this.disclaims)) {
      this.disclaims[subject] = [];
    }
    this.disclaims[subject]!.push(action);
  }
  role(role: keyof TRoleRules) {
    this.roles.push(role);
  }
  can(subjectType: keyof TSubjectActions) {
    return (user: TUser, subject: TTypes[TSubjectActions[typeof subjectType][0]], action: ActionsOf<TTypes, TSubjectActions, typeof subjectType>) => {
      
    };
  }
}