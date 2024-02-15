export type Condition<TUser, TSubject> = (user: TUser, subject: TSubject) => boolean;
export function and<TUser, TSubject>(...conditions: Condition<TUser, TSubject>[]): Condition<TUser, TSubject> {
  return (user, subject) => conditions.every(c => c(user, subject));
}
export function not<TUser, TSubject>(condition: Condition<TUser, TSubject>): Condition<TUser, TSubject> {
  return (user, subject) => !condition(user, subject);
}
export function makeTrue<TUser, TSubject>(): Condition<TUser, TSubject> {
  return () => true;
}
export function makeFalse<TUser, TSubject>(): Condition<TUser, TSubject> {
  return () => false;
}