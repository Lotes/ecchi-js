declare module "*.ecchi" {
  import type { Reflection, SubjectActionsBase, TypeBase } from "@ecchi-js/core";
  export type $UserType = TypeBase;
  export type $Types = Record<string, TypeBase>;
  export const $Reflection = Reflection<$Types>;
  export const $SubjectActions: Record<string, SubjectActionsBase>;
  export const $Conditions: Record<string, (user: $UserType, article: TypeBase) => boolean>;
  export const $Roles: Record<string, RoleRules<$UserType, $Types, typeof $SubjectActions>>;
}