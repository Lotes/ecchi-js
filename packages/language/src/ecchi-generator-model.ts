import { AccessRuleMode, NestedSetElement } from "@ecchi-js/core";
import { ActionMember, ConceptDefinition, Expression, Model, PermissionStatement, RoleDefinition, Statement, SubjectDefinition, WhenStatement, isConceptDefinition, isPermissionStatement, isRoleDefinition, isSelectEverthing, isSubjectDefinition, isWhenStatement } from "./generated/ast.js";
import { assertUnreachable } from "langium";
import { ExpressionBuilder, ExpressionBuilderFactoryImpl, ExpressionBuilderImpl, OpcodeElement } from "./ecchi-generator-conditions.js";
import { Bitmask } from "./ecchi-bitmasks.js";

export type ConceptMap = Map<ConceptDefinition, ConceptData>;
export type SubjectMap = Map<SubjectDefinition, SubjectData>;

export interface EcchiGeneratorModel {
  user: ConceptDefinition|undefined;
  environment: ConceptDefinition|undefined;
  concepts: ConceptMap;
  subjects: SubjectMap;
  roles: RoleData;
}

export interface ConceptData {
  children: ConceptDefinition[];
  parent: ConceptDefinition|undefined;
  nestedSet: NestedSetElement;  
}

export interface SubjectData {
  actions: Map<ActionMember, ActionData>;
}

export type ActionData = Record<AccessRuleMode, BitBitmask>;

export interface BitBitmask {
  byteIndex: number;
  bitIndex: number;
  bitmask: Bitmask<ActionMember>;
}

export type SubjectRules = {
  expressions: OpcodeElement[];
  conditions: ExpressionBuilderImpl;
  rules: Map<RoleDefinition, AccessRule[]>;
};

export interface RoleData {
  expressions: OpcodeElement[];
  subjects: Map<SubjectDefinition, SubjectRules>;
  roles: RoleDefinition[];
}

export interface AccessRule {
  actions: ActionMember[];
  condition: number;
  mode: "allow"|"forbid";
}

export function buildGeneratorModel(model: Model): EcchiGeneratorModel {
  const subjects = getSubjects(model);
  const user = model.userDeclaration.type.ref!;
  const environment = model.environmentDeclaration?.type.ref;
  return {
    user,
    environment,
    concepts: getConcepts(model),
    subjects,
    roles: getRoles(model, environment, user, subjects),
  };
}

function getRoles(model: Model, environment: ConceptDefinition|undefined, user: ConceptDefinition, subjects: SubjectMap): RoleData {
  const expressions = new ExpressionBuilderFactoryImpl(environment, user);
  const roles = model.elements.filter(isRoleDefinition);
  const subjectRules = new Map<SubjectDefinition, SubjectRules>();
  for (const [subject] of subjects) {
    const conditions = expressions.forSubject(subject.type.ref!);
    subjectRules.set(subject, {
      expressions: conditions.subjectElements,
      conditions,
      rules: new Map(),
    });
  }
  for (const role of roles) {
    for (const member of role.members) {
      const subjectData = subjects.get(member.subject.ref!)!;
      const rules = subjectRules.get(member.subject.ref!)!;
      const conditions = rules.conditions;
      const rendered = member.members.flatMap(m => renderConditionsAndRules(subjectData, m, conditions));
      rules.rules.set(role, rendered);
    }
  }
  return {
    expressions: expressions.commonElements,
    subjects: subjectRules,
    roles,
  };
}

function getSubjects(model: Model) {
  const subjects = model.elements.filter(isSubjectDefinition);
  const subjectMap = new Map<SubjectDefinition, SubjectData>();
  for (const subject of subjects) {
    const data = getSubjectData(subject);
    subjectMap.set(subject, data);
  }
  return subjectMap;
}

function getConcepts(model: Model) {
  const concepts = model.elements.filter(isConceptDefinition);
  const conceptMap = new Map<ConceptDefinition, ConceptData>();
  const roots: ConceptDefinition[] = [];
  for (const concept of concepts) {
    const children = concepts.filter(c => c.superConcept?.ref === concept);
    const parent = concept.superConcept?.ref;
    const nestedSet = [0, 0] as const;
    conceptMap.set(concept, <ConceptData>{ children, parent, nestedSet });
    if (!parent) {
      roots.push(concept);
    }
  }
  function visit(content: ConceptDefinition): Tree<ConceptDefinition> {
    const children = conceptMap.get(content)!.children.map(visit);
    return <Tree<ConceptDefinition>>{ content, children };
  }
  const trees = roots.map(visit);
  const nestedSets = getNestedSetsTraversal(trees);
  for (const concept of concepts) {
    conceptMap.get(concept)!.nestedSet = nestedSets.get(concept)!;
  }
  return conceptMap;
}

function getSubjectData(subject: SubjectDefinition): SubjectData {
  const byName = getActions(subject);
  const parents = new Map<string, string|undefined>();
  const actions = new Map<ActionMember, ActionData>();
  for (const member of subject.members) {
    parents.set(member.name, member.superAction?.ref?.name);
  }
  const bitmask = Bitmask.create<ActionMember>(subject.members);
  for (const member of subject.members) {
    const allowBitmask = bitmask.clone();
    const forbidBitmask = bitmask.clone();
    
    let current: string|undefined = member.name;
    while(current) {
      allowBitmask.set(byName.get(current)!.content, "allow", true);
      current = parents.get(current);
    }

    const todo = [member.name];
    while(todo.length > 0) {
      const current = todo.pop()!;
      const action = byName.get(current)!;
      const children = action.children;
      forbidBitmask.set(action.content, "forbid", true);
      for (const child of children) {
        todo.push(child.content.name);
      }
    }

    actions.set(member, {
      allow: {
        ...bitmask.getBitIndices(member, "allow")!,
        bitmask: allowBitmask,
      },
      forbid: {
        ...bitmask.getBitIndices(member, "forbid")!,
        bitmask: forbidBitmask,
      }
    });
  }
  return {
    actions,
  };
}

export interface Tree<S> {
  content: S;
  children: Tree<S>[];
}

export function treeToString<C>(tree: Tree<C>, visitor: (node: C, children: string[]) => string): string {
  return visitor(tree.content, tree.children.map(c => treeToString<C>(c, visitor)));  
}

function getActions(subject: SubjectDefinition) {
  const map = new Map<string, Tree<ActionMember>>();
  for (const member of subject.members) {
    map.set(member.name, {content:member, children: []});
  }
  return map;
}

function getNestedSetsTraversal<C>(roots: Tree<C>[]) {
  const nestedSets = new Map<C, NestedSetElement>();
  let counter = 0;
  function visit(node: Tree<C>) {
    const left = counter++;
    for (const child of node.children) {
      visit(child);
    }
    const right = counter++;
    nestedSets.set(node.content, [left, right]);
  }
  for (const node of roots) {
    visit(node);
  }
  return nestedSets;
}

function renderConditionsAndRules(
  subject: SubjectData,
  statement: Statement,
  conditions: ExpressionBuilder
): AccessRule[] {
  return renderStatement(statement, subject);

  function renderStatement(statement: Statement, subject: SubjectData): AccessRule[] {
    if (isPermissionStatement(statement)) {
      return renderPermissionStatement(statement, subject);
    } else if(isWhenStatement(statement)) {
      return renderWhenStatement(statement);
    } else {
      assertUnreachable(statement);
    }
  }

  function renderStatements(statements: Statement[]): AccessRule[] {
    return statements.flatMap(statement => renderStatement(statement, subject));
  }

  function andWith(condition: number, rules: AccessRule[]): AccessRule[] {
    return rules.map(rule => ({
      ...rule,
      condition: conditions.binary('&&', rule.condition, condition) 
    }));
  }

  function renderWhenStatement(statement: WhenStatement): AccessRule[] {
    const condtionId = renderExpression(statement.condition);
    const $then = andWith(condtionId, renderStatements(statement.thenBlock.statements));
    let $else: AccessRule[] = []
    if(statement.alternative) {
      const notExpressionId = conditions.unary('!', condtionId);
      if(statement.alternative.when) {
        $else = renderWhenStatement(statement.alternative.when);
      } else {
        $else = renderStatements(statement.alternative.elseBlock!.statements);
      }
      $else = andWith(notExpressionId, $else);
    }
    return [...$then, ...$else];
  }

  function renderExpression(expression: Expression): number {
    switch (expression.$type) {
      case "BinaryExpression":
        const lhs = renderExpression(expression.left);
        const rhs = renderExpression(expression.right);
        return conditions.binary(expression.op, lhs, rhs);
      case "BooleanLiteral":
        return conditions.boolean(expression.value);
      case "NullLiteral":
        return conditions.null();
      case "NumberLiteral":
        return conditions.number(expression.value);
      case "Parentheses":
        return renderExpression(expression.expr);
      case "StringLiteral":
        return conditions.string(expression.value);
      case "UnaryExpression":
        const operand = renderExpression(expression.operand);
        return conditions.unary(expression.op, operand);
      case "PropertyMemberAccess":
        const receiver = renderExpression(expression.receiver);
        return conditions.property(receiver, expression.member.ref!.name);
      case "RootMember":
        return conditions.builtIn(expression.kind);
      case "IsExpression":
        const operandIndex = renderExpression(expression.expr);
        const type = expression.type.ref!;
        return conditions.is(operandIndex, type);
      case "ArrayMemberAccess":
        const receiverIndex = renderExpression(expression.receiver);
        const index = renderExpression(expression.expr);
        return conditions.arrayAt(receiverIndex, index);
      default:
        assertUnreachable(expression);
    }
  }

  function renderPermissionStatement(statement: PermissionStatement, subject: SubjectData): AccessRule[] {
    const mode = statement.allows ? "allow" : "forbid";
    const actions = isSelectEverthing(statement.actions)
      ? [...subject.actions.keys()]
      : statement.actions.actions.map(e => e.action.ref).filter(e => e !== undefined) as ActionMember[];
    return [{
      actions,
      condition: conditions.true(),
      mode
    }];
  }
}
