import "@ecchi-js/language/register";
import { UserType } from "./Blog.ecchi";

const user: UserType = {
  id: 1,
  name: 'John Doe',
  email: '',
  createdAt: '',
  updatedAt: '',
};

console.log(JSON.stringify(user, null, 2));
