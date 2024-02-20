declare module "*.ecchi" {
  import type { Reflection, SubjectActionsBase, TypeBase } from "@ecchi-js/core";
  declare type $UserType = TypeBase;
  declare type $Types = Record<string, TypeBase>;
  declare const $Reflection = Reflection<$Types>;
  declare const $SubjectActions: Record<string, SubjectActionsBase>;
  declare const $Conditions: Record<string, (user: $UserType, article: TypeBase) => boolean>;
  declare const $Roles: Record<string, RoleRules<$UserType, $Types, typeof $SubjectActions>>;
}