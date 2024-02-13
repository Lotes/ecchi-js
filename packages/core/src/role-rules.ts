import { TypeBase } from "./common.js";
import { Condition } from "./conditions.js";
import { TypesBase } from "./reflection.js";
import { ActionsOf, SubjectActionsBase } from "./subject-actions.js";

export type RoleRule<TUser extends TypeBase, TSubject extends TypeBase, TActions extends string> = {
  conditions?: Condition<TUser, TSubject>[];
  kind: "allow" | "forbid";
  actions: TActions[];
}

export type RoleRulesInput<
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
    private readonly rules: RoleRulesInput<TUser, TTypes, TSubjectActions>
  ) {}
  // private apply<TSubject extends TSubjects[keyof TSubjects]>(
  //   subjectName: keyof TSubjects,
  //   user: TUser,
  //   subject: TSubject,
  //   allow: (...action: ActionsOfSubject<TUser, TSubjects, typeof subjectName>[]) => void,
  //   forbid: (...action: ActionsOfSubject<TUser, TSubjects, typeof subjectName>[]) => void
  // ) {
  //   if(!(subjectName in this.rules)) { return; }
  //   const subjectRules = this.getRulesOfSubject(subjectName);
  //   for (const subjectRule of subjectRules) {
  //     if(!subjectRule.conditions || and<TUser, TSubject>(subjectRule.conditions as any)(user, subject)) {
  //       if(subjectRule.kind === "allow") {
  //         allow(...subjectRule.actions as any);
  //       } else {
  //         forbid(...subjectRule.actions as any);
  //       }
  //     }
  //   }
  // }
  // private getRulesOfSubject(subjectName: keyof TSubjects): TSubjects[typeof subjectName] extends Subject<TUser, infer TSubject, infer TActions> ? RoleRule<TUser, TSubject, TActions>[] : never {
  //   return this.subjectActions[subjectName] as any;
  // }
}