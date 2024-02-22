import { $UserType, TranspilingError } from "./Blog.ecchi";

const user: $UserType = {
  $type: "UserType",
  id: 1,
  name: 'John Doe',
  email: '',
  createdAt: '',
  updatedAt: '',
};

console.log(JSON.stringify(user, null, 2));
