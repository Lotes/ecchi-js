import { Condition, Reflection, Role, Subject } from "./index.js";

export interface UserType { 
  $type: 'UserType';
  id: number;
  name: string;
}
export interface ArticleType {
  $type: 'ArticleType';
  id: number;
  title: string;
  content: string;
  author: UserType;
}

export type $Types = {
  ArticleType: ArticleType,
  UserType: UserType
};

export const $Reflection = new Reflection<$Types>({
  ArticleType: [1, 2],
  UserType: [3, 4]  
});

export const $Subjects = {
  Article: new Subject<UserType, ArticleType, 'read'|'edit'|'create'>({
    read: [[1, 6], 0],
    edit: [[2, 5], 1],
    create: [[3, 4], 2],
  })
};

const isAuthor: Condition<UserType, ArticleType> = (user, article) => user.id === article.author.id;

export const $Roles = {
  NormalUser: new Role<UserType, typeof $Subjects>($Subjects),
  Admin: new Role<UserType, typeof $Subjects>($Subjects)
};