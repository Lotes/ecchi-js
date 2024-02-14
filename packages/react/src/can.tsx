export type CanProps<TUser, TSubject, TAction extends string> = {
  I: TUser;
  do: TAction;
  this: TSubject;
  children: React.ReactNode;
};

export function Can<TUser, TSubject, TAction extends string>({ I, do: action, this: thisObj, children }: CanProps<TUser, TSubject, TAction>) {
  return <div>{children}</div>;
}

export function Cannot<TUser, TSubject, TAction extends string>({ I, do: action, this: thisObj, children }: CanProps<TUser, TSubject, TAction>) {
  return <div>{children}</div>;
}