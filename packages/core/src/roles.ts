import { TypeBase } from "./common.js";
import { Condition } from "./conditions.js";
import { Subject } from "./subjects.js";

export type Rule<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> = {
  conditions?: Condition<TUser, TSubject>[];
  kind: "allow" | "forbid";
  actions: TActions[];
}

export type Rules<TUser extends TypeBase, TSubjects extends Record<string, Subject<TUser, any, string>>> 
  = Partial<{
    [S in keyof TSubjects]
      : (TSubjects[S] extends Subject<TUser, infer TSubject, infer TActions> ? Rule<TUser, TSubject, TActions>[] : never)
  }>;

export class Role<
  TUser extends TypeBase,
  TSubjects extends Record<string, Subject<TUser, any, string>>
> {
  constructor(
    private readonly subjects: TSubjects,
    private readonly rules: Rules<TUser, TSubjects>
  ) {}
  
}