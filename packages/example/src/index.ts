import { $UserType, can, $Types } from "./Blog.ecchi";

const user: $UserType = {
  $type: "UserType",
  id: 1,
  name: 'John Doe',
  email: '',
  createdAt: '',
  updatedAt: '',
};

const article: $Types["ArticleType"] = {
  $type: "ArticleType",
  id: 1,
  title: 'Hello World',
  content: 'Hello World',
  createdAt: '',
  updatedAt: '',
  author: user,
  published: true,
};

console.log(can({
  I: user,
  when: 'Article',
  subject: article,
  doWhat: 'read',
  actingAs: ['AdminUser']
}));