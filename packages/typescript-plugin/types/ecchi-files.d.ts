declare module "*.ecchi" {
  import type { Reflection, TypeBase } from "@ecchi-js/core";
  export type $UserType = TypeBase;
  export type $EnvironmentType = TypeBase|undefined;
  export type $Types = Record<string, TypeBase>;
  export const $Reflection: Reflection<$Types>;
  export type $Role = string;
  export type $Subject = string;
  export type $Subjects = Record<$Subject, TypeBase>;
  export type $Actions = Record<$Subject, string>;
  export type CanOptions = {
    I: $UserType;
    actingAs?: $Role[];
    cache?: Cache;
    when: string;
    subject: TypeBase;
    doWhat: string;
  }
  export function can(options: CanOptions);
}