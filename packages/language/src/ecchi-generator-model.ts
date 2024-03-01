import { NestedSetElement } from "@ecchi-js/core";
import { ActionMember, ConceptDefinition, Expression, Model, PermissionStatement, RoleDefinition, Statement, SubjectDefinition, WhenStatement, isConceptDefinition, isPermissionStatement, isRoleDefinition, isSelectEverthing, isSubjectDefinition, isWhenStatement } from "./generated/ast.js";
import { assertUnreachable } from "langium";
import { ExpressionBuilder, ExpressionBuilderFactoryImpl, OpcodeElement } from "./ecchi-generator-conditions.js";

export type ConceptMap = Map<ConceptDefinition, ConceptData>;
export type SubjectMap = Map<SubjectDefinition, SubjectData>;
export type RoleMap = Map<RoleDefinition, RoleData>;

export interface EcchiGeneratorModel {
  user: ConceptDefinition|undefined;
  environment: ConceptDefinition|undefined;
  concepts: ConceptMap;
  subjects: SubjectMap;
  roles: RoleMap;
}

export interface ConceptData {
  children: ConceptDefinition[];
  parent: ConceptDefinition|undefined;
  nestedSet: NestedSetElement;  
}

export interface SubjectData {
  instances: Map<string, Tree<ActionMember>>;
  roots: Tree<ActionMember>[];
  hierarchy: Map<ActionMember, NestedSetElement>;
  parents: Map<string, string|undefined>;
}

export type SubjectRules = Map<SubjectDefinition, AccessRule[]>;

export interface RoleData {
  expressions: OpcodeElement[];
  rules: SubjectRules;
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

function getRoles(model: Model, environment: ConceptDefinition|undefined, user: ConceptDefinition, subjects: SubjectMap): RoleMap {
  const map = new Map<RoleDefinition, RoleData>();
  for (const role of model.elements.filter(isRoleDefinition)) {
    const rules = new Map<SubjectDefinition, AccessRule[]>();
    const expressions = new ExpressionBuilderFactoryImpl(environment, user);
    for (const member of role.members) {
      const subjectData = subjects.get(member.subject.ref!)!;
      const conditions = expressions.forSubject(member.subject.ref!.type.ref!);
      const rendered = member.members.flatMap(m => renderConditionsAndRules(subjectData, m, conditions, rules));
      rules.set(member.subject.ref!, rendered);
    }
    map.set(role, {
      expressions: expressions.elements,
      rules
    });
  }
  return map;
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
  const actions = getActions(subject);
  const actionRoots = getHierarchy(actions, action => action.superAction?.ref?.name);
  const actionNestedSets = getNestedSetsTraversal(actionRoots);
  const parents = new Map<string, string|undefined>();
  for (const member of subject.members) {
    parents.set(member.name, member.superAction?.ref?.name);
  }
  return {
    instances: actions,
    roots: actionRoots,
    hierarchy: actionNestedSets,
    parents,
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

function getHierarchy<K, V>(map: Map<K, Tree<V>>, getParent: (child: V) => K|undefined) {
  const roots: Tree<V>[] = [];
  for (const node of map.values()) {
    const parent = getParent(node.content);
    if (parent) {
      const superNode = map.get(parent)!;
      superNode.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function renderConditionsAndRules(
  subject: SubjectData,
  statement: Statement,
  conditions: ExpressionBuilder,
  rules: Map<SubjectDefinition, AccessRule[]>
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
      ? [...subject.hierarchy.keys()]
      : statement.actions.actions.map(e => e.action.ref).filter(e => e !== undefined) as ActionMember[];
    return [{
      actions,
      condition: conditions.true(),
      mode
    }];
  }
}
