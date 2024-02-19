import { $Types, $Reflection } from "./Blog.ecchi";

const user: $Types.UserType = {
  $type: "UserType",
  id: 1,
  name: 'John Doe',
  email: '',
  createdAt: '',
  updatedAt: '',
};

$Reflection.isSubTypeOf(user);

console.log(JSON.stringify(user, null, 2));
