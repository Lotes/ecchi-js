import { TypeBase } from "./common.js";
import { Condition, and } from "./conditions.js";
import { ActionsOfSubject, Subject } from "./subjects.js";

export type RoleRule<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> = {
  conditions?: Condition<TUser, TSubject>[];
  kind: "allow" | "forbid";
  actions: TActions[];
}

export type RoleRules<TUser extends TypeBase, TSubjects extends Record<string, Subject<TUser, any, string>>> 
  = Partial<{
    [S in keyof TSubjects]
      : (TSubjects[S] extends Subject<TUser, infer TSubject, infer TActions> ? RoleRule<TUser, TSubject, TActions>[] : never)
  }>;

export class Role<
  TUser extends TypeBase,
  TSubjects extends Record<string, Subject<TUser, any, string>>
> {
  constructor(
    private readonly subjects: TSubjects,
    private readonly rules: RoleRules<TUser, TSubjects>
  ) {}
  apply<TSubject extends TSubjects[keyof TSubjects]>(
    subjectName: keyof TSubjects,
    user: TUser,
    subject: TSubject,
    allow: (...action: ActionsOfSubject<TUser, TSubjects, typeof subjectName>[]) => void,
    forbid: (...action: ActionsOfSubject<TUser, TSubjects, typeof subjectName>[]) => void
  ) {
    if(!(subjectName in this.rules)) { return; }
    const subjectRules = this.getRulesOfSubject(subjectName);
    for (const subjectRule of subjectRules) {
      if(!subjectRule.conditions || and<TUser, TSubject>(subjectRule.conditions as any)(user, subject)) {
        if(subjectRule.kind === "allow") {
          allow(...subjectRule.actions as any);
        } else {
          forbid(...subjectRule.actions as any);
        }
      }
    }
  }
  private getRulesOfSubject(subjectName: keyof TSubjects): TSubjects[typeof subjectName] extends Subject<TUser, infer TSubject, infer TActions> ? RoleRule<TUser, TSubject, TActions>[] : never {
    return this.subjects[subjectName] as any;
  }
}