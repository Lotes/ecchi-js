grammar Ecchi

entry Model:
  userDeclaration=UserDeclaration
  (elements+=Element)*;

UserDeclaration:
  'use' type=[ConceptDefinition:ID] 'as' 'user'
;

Element: ConceptDefinition | SubjectDefinition | RoleDefinition;

ConceptDefinition:
  'concept' name=ID ('extends' superInterface=[ConceptDefinition:ID])? '{'
    members+=PropertyMember*
  '}';

SubjectDefinition:
  'subject' name=ID 'of' type=[ConceptDefinition:ID] '{'
        members+=ActionMember*
    '}';

RoleDefinition:
  'role' name=ID '{'
        members+=ForMember*
    '}'
;

ForMember:
  'for' subject=[SubjectDefinition:ID] '{'
    members+=Statement*
  '}'
;

WhenStatement: 'when' expression=Expression '{' permissions+=Statement* '}' alternative=OtherwiseStatement?;

OtherwiseStatement: 'otherwise' (when=WhenStatement | '{' permissions+=Statement* '}');

PermissionStatement: (allows?='allow'|'forbid') actions=PermissionActions;

Statement: WhenStatement | PermissionStatement;

PermissionActions:
  {infer SelectEverthing} '*'
  | {infer SelectMultiple} actions+=PermissionAction+
;

PermissionAction: action=[ActionMember:ID];

PropertyMember:
  name=ID isOptional?='?'? ':' type=TypeReference ';'?;

ActionMember:
  'action' name=ID ('extends' superAction=[ActionMember:ID])? ';'?
;

TypeReference:
  {infer ConceptReference}type=[ConceptDefinition:ID]
  | {infer NumberType}'number'
  | {infer NullType}'null'
  | {infer StringType}'string'
  | {infer BooleanType}'boolean'
;

Expression infers Expression:
  Or
;

Or infers Expression:
  And ({infer BinaryExpression.left=current} op='||' right=And)*
;

And infers Expression:
  Equal ({infer BinaryExpression.left=current} op='&&' right=Equal)*
;

Equal infers Expression:
  Relation ({infer BinaryExpression.left=current} op=('=='|'!=') right=Relation)*
;

Relation infers Expression:
  Multiply ({infer BinaryExpression.left=current} op=('<='|'>='|'<'|'>') right=Multiply)*
;

Multiply infers Expression:
  Addition ({infer BinaryExpression.left=current} op=('/'|'*'|'%') right=Addition)*
;

Addition infers Expression:
  Unary ({infer BinaryExpression.left=current} op=('+'|'-') right=Unary)*
;

Unary infers Expression:
  {infer UnaryExpression}op=('!'|'-'|'+') expression=Unary
    | Term
;

Term infers Expression:
  Primary (
        {infer PropertyMemberAccess.receiver=current} '.' member=[PropertyMember:ID]
//TODO:        | {infer ArrayMemberAccess.receiver=current} '[' expr=Expression ']'
    )*
;

Primary infers Expression: {infer Parentheses} '(' expr=Expression ')'
    | Literal
    | {infer RootMember}(isSubjectRoot?='subject'|'user')
    | {infer TypeOfExpression} 'typeof' type=[ConceptDefinition:ID]
;

Literal infers Expression:
  {infer NumberLiteral}value=NUMBER
    | {infer StringLiteral}value=STRING
    | {infer BooleanLiteral}value=('true'|'false')
    | {infer NullLiteral}value='null'
;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;