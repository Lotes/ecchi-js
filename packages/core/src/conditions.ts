export type Condition<TUser, TSubject> = (user: TUser, subject: TSubject) => boolean;
export function andify<TUser, TSubject>(...conditions: Condition<TUser, TSubject>[]): Condition<TUser, TSubject>|undefined {
  return conditions.length > 0 ? (user, subject) => conditions.every(c => c(user, subject)) : undefined;
}