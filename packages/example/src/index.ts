import { $UserType, $Reflection, $SubjectActions } from "./Blog.ecchi";

const user: $UserType = {
  $type: "UserType",
  id: 1,
  name: 'John Doe',
  email: '',
  createdAt: '',
  updatedAt: '',
};

console.log($Reflection, $SubjectActions, user);