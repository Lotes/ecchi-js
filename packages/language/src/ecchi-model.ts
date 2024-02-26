import { NestedSetElement } from "@ecchi-js/core";
import { ActionMember, ConceptDefinition, Model, SubjectDefinition, isConceptDefinition, isSubjectDefinition } from "./generated/ast.js";

export interface EcchiModel {
  user: ConceptDefinition|undefined;
  concepts: {
    instances: ConceptDefinition[];
    map: Map<string, Tree<ConceptDefinition>>;
    roots: Tree<ConceptDefinition>[];
    hierarchy: Map<ConceptDefinition, NestedSetElement>;
  };
  subjects: {
    instances: SubjectDefinition[];
    map: Map<string, SubjectData>;
  };
}

export interface SubjectData {
  instances: Map<string, Tree<ActionMember>>;
  roots: Tree<ActionMember>[];
  hierarchy: Map<ActionMember, NestedSetElement>;
  parents: Map<string, string|undefined>;
}

export function buildDomain(model: Model): EcchiModel {
  const concepts = getConcepts(model);
  const conceptMap = getConceptMap(concepts);
  const conceptsRoots = getHierarchy(conceptMap,  concept => concept.superConcept?.ref?.name);
  const conceptNestedSets = getNestedSetsTraversal(conceptsRoots);
  const subjects = getSubjects(model);
  const subjectMap = new Map<string, SubjectData>();
  for (const subject of subjects) {
    const data = getSubjectData(subject);
    subjectMap.set(subject.name, data);
  }
  const user = model.userDeclaration.type.ref;
  return {
    user,
    concepts: {
      instances: concepts,
      map: conceptMap,
      roots: conceptsRoots,
      hierarchy: conceptNestedSets
    },
    subjects: {
      instances: subjects,
      map: subjectMap
    },
  };
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

function getSubjects(model: Model) {
  return model.elements.filter(isSubjectDefinition);
}

function getConcepts(model: Model) {
  return model.elements.filter(isConceptDefinition);
}

function getConceptMap(concepts: ConceptDefinition[]) {
  const map = new Map<string, Tree<ConceptDefinition>>();
  for (const iface of concepts) {
    map.set(iface.name, {
      content: iface,
      children: [],
    });
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
