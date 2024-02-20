declare module "*.ecchi" {
  import type { Reflection, SubjectActionsBase, TypeBase } from "@ecchi-js/core";
  declare type $Types = Record<string, TypeBase>;
  declare const $Reflection = Reflection<$Types>;
  declare const $SubjectActions: Record<string, SubjectActionsBase>;
}