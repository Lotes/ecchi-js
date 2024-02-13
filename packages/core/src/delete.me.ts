import { TypeBase } from "./common.js";
import { Role } from "./role-rules.js";
import { Subject } from "./subject-actions.js";

class PermissionsBase<
  TUser extends TypeBase,
  TSubject extends TypeBase,
  TAction extends string
> {
  protected readonly allowMask: Uint8Array;
  protected readonly forbidMask: Uint8Array;
  constructor(
    protected readonly subject: Subject<TUser, TSubject, TAction>
  ) {
    const size = subject.actionCount / 8 + (subject.actionCount %  8 > 0 ? 1 : 0);
    this.allowMask = new Uint8Array(size);
    this.forbidMask = new Uint8Array(size);
  }
  protected getCoordinates(action: TAction) {
    const actionIndex = this.subject.toActionIndex(action);
    return [actionIndex / 8, actionIndex % 8];
  }
} 

export class PermissionBuilder<
  TSubjects extends Record<string, Subject<TypeBase, TypeBase, string>>,
  TRoles extends Record<string, Role<TUser, TSubjects>>,
  TUser extends TypeBase,
  TSubject extends TypeBase,
  TAction extends string
> extends PermissionsBase<TUser, TSubject, TAction> {  
  constructor(
    private readonly user: TUser,
    subjects: TSubjects,
    private readonly roles: TRoles,
    private readonly subjectName: keyof TSubjects
  ) {
    super(subjects[subjectName] as any);
  }
  allow(...actions: TAction[]) {
    for(const action of actions) {
      this.subject.getActionParentsAndSelf(action).forEach((otherAction) => {
        const [index, bit] = this.getCoordinates(otherAction);
        this.allowMask[index] |= (1 << bit);
      });
    }     
    return this;
  }
  forbid(...actions: TAction[]) {
    for(const action of actions) {
      this.subject.getActionChildrenAndSelf(action).forEach((otherAction) => {
        const [index, bit] = this.getCoordinates(otherAction);
        this.forbidMask[index] |= (1 << bit);
      });
    }
    return this;
  }
  assignRoles(...roleNames: (keyof TRoles)[]) {
    for(const roleName of roleNames) {
      const role = this.roles[roleName];
         
    }
    return this;
  }
  build() {
    return new Permissions(this.subject, this.allowMask, this.forbidMask);
  }
}

export class Permissions<
  TUser extends TypeBase,
  TSubject extends TypeBase,
  TAction extends string
> extends PermissionsBase<TUser, TSubject, TAction> {
  constructor(
    subject: Subject<TUser, TSubject, TAction>,
    allowMask: Uint8Array,
    forbidMask: Uint8Array
  ) {
    super(subject);
    this.allowMask.set(allowMask);
    this.forbidMask.set(forbidMask);
  }
  can(action: TAction): boolean {
    if(this.cannot(action)) { return false; }
    const [index, bit] = this.getCoordinates(action);
    return (this.allowMask[index] & (1 << bit)) !== 0; 
  }
  cannot(action: TAction): boolean {
    const [index, bit] = this.getCoordinates(action);
    return (this.forbidMask[index] & (1 << bit)) !== 0;
  }
  *allowedActions() {
    yield* this.toActions(this.allowMask);
  }
  *forbiddenActions() {
    yield* this.toActions(this.forbidMask);
  }
  private * toActions(mask: Uint8Array) {
    for (let index = 0; index < this.subject.actionCount; index++) {
      const byte = mask[index / 8];
      const bit = 1 << (index % 8);
      if((byte & bit) !== 0) {
        yield this.subject.fromActionIndex(index);
      }
    }
  }
}
