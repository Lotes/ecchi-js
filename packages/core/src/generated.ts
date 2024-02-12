import { Reflection, Subject } from "./types.js";

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
    read: [[1, 6], 0, undefined],
    edit: [[2, 5], 1, (user: UserType, article: ArticleType) => user.id === article.author.id],
    create: [[3, 4], 2, undefined],
  })
}