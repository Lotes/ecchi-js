import { Reflection, RoleRules, SubjectActions, SubjectActionsBase, not } from "../src/index.js";

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

export const $SubjectActions = {
  Article: ["ArticleType", new SubjectActions<'read'|'edit'|'create'>({
    read: [[1, 6], 0],
    edit: [[2, 5], 1],
    create: [[3, 4], 2],
  })]
} satisfies SubjectActionsBase<$Types>;

const $Conditions = {
  isAuthor: (user: UserType, article: ArticleType) => user.id === article.author.id
}

export const $Roles = {
  NormalUser: new RoleRules<UserType, $Types, typeof $SubjectActions>($SubjectActions, {
    Article: [{
      conditions: [$Conditions.isAuthor],
      kind: 'allow',
      actions: ['edit']
    }, {
      conditions: [not($Conditions.isAuthor)],
      kind: 'allow',
      actions: ['read', 'create']
    }]
  }),
  Admin: new RoleRules<UserType, $Types, typeof $SubjectActions>($SubjectActions, {
    Article: [{
      kind: 'allow',
      actions: ['read', 'edit', 'create']
    }]
  })
};