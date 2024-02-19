declare module "*.ecchi" {
  import type { Reflection, TypeBase } from "@ecchi-js/core";
  declare type $Types = Record<string, TypeBase>;
  declare const $Reflection = Reflection<$Types>;
}