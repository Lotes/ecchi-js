import { $Types, $Reflection, $SubjectActions, $UserType } from "./Blog.ecchi";

const user: $UserType = {
  $type: "UserType",
  id: 1,
  name: 'John Doe',
  email: '',
  createdAt: '',
  updatedAt: '',
};

$Reflection.isSubTypeOf(user, user);

console.log(JSON.stringify(user, null, 2));
