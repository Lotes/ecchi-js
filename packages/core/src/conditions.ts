export type Condition<TUser, TSubject, TEnvironment> = (user: TUser, subject: TSubject, environment: TEnvironment) => boolean;
export function and<TUser, TSubject, TEnvironment>(...conditions: Condition<TUser, TSubject, TEnvironment>[]): Condition<TUser, TSubject, TEnvironment> {
  return (user, subject, environment) => conditions.every(c => c(user, subject, environment));
}
export function or<TUser, TSubject, TEnvironment>(...conditions: Condition<TUser, TSubject, TEnvironment>[]): Condition<TUser, TSubject, TEnvironment> {
  return (user, subject, environment) => conditions.some(c => c(user, subject, environment));
}
export function not<TUser, TSubject, TEnvironment>(condition: Condition<TUser, TSubject, TEnvironment>): Condition<TUser, TSubject, TEnvironment> {
  return (user, subject, environment) => !condition(user, subject, environment);
}
export function yes<TUser, TSubject, TEnvironment>(): Condition<TUser, TSubject, TEnvironment> {
  return () => true;
}
export function no<TUser, TSubject, TEnvironment>(): Condition<TUser, TSubject, TEnvironment> {
  return () => false;
}