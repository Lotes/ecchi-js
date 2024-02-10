grammar Ecchi

entry Model:
    (elements+=Element)*;

Element:
    InterfaceDefinition | TypeDefinition | UserDefinition
    ;

InterfaceDefinition:
    'interface' name=ID ('extends' superInterface=[InterfaceDefinition:ID])? '{'
        members+=PropertyMember*
    '}';

TypeDefinition:
    'type' name=ID '=' expression=TypeReference;

UserDefinition:
    'user' 'of' type=[InterfaceDefinition:ID] '{'
        members+=UserMemberDefinition*
    '}';

UserMemberDefinition:
    SubjectDefinition|RoleDefinition;

SubjectDefinition:
    'subject' name=ID 'of' type=[InterfaceDefinition:ID] '{'
        members+=ActionMember*
    '}';

RoleDefinition:
    'role' name=ID '{'
        members+=ForMember*
    '}'
;

ForMember:
    'for' subject=[SubjectDefinition:ID] '{'
        members+=PermissionMember*
    '}'
;

PermissionMember:
    (allows?='allow'|'forbid') body=PermissionBody ';'?
;

PermissionBody: 
    {infer SelectEverthing} '*'
    | {infer SelectSingle} action=[ActionMember:ID] ('when' condition=Expression)?
    ;

PropertyMember:
    name=ID ':' type=TypeReference ';'?;

ActionMember:
    'action' name=ID ('extends' superAction=[ActionMember:ID])? ';'?
;

type Definition = InterfaceDefinition | TypeDefinition;

TypeReference:
    {infer TypeDefinitionReference}type=[Definition:ID]
    | {infer NumberType}'number'
    | {infer StringType}'string'
    | {infer BooleanType}'boolean'
    | {infer ListType} '[' type=TypeReference ']'
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
        | {infer ArrayMemberAccess.receiver=current} '[' expr=Expression ']'
    )*
    ;

Primary infers Expression:
    {infer Parentheses} '(' expr=Expression ')'
    | Literal
    | {infer RootMember}(isSubjectRoot?='subject'|'user')
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