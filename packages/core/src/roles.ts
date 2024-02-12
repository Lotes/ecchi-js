import { TypeBase } from "./common.js";
import { Subject } from "./subjects.js";

export class Role<
  TUser extends TypeBase,
  TSubjects extends Record<string, Subject<TUser, any, string>>
> {
  constructor(
    private readonly subjects: TSubjects,
  ) {}
}