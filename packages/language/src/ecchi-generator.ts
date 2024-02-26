import { URI, assertUnreachable } from "langium";
import { EcchiServices, createEcchiServices } from "./ecchi-module.js";
import { ConceptDefinition, Model, SubjectDefinition, TypeReference, isSubjectDefinition } from "./generated/ast.js";
import { NestedSetElement } from "@ecchi-js/core";
import { EmptyFileSystem } from "langium";
import { readFile } from "fs/promises";
import { Tree, buildDomain } from "./ecchi-model.js";

export async function generate(fileName: string) {
  const services = createEcchiServices(EmptyFileSystem);
  const input = await readFile(fileName, 'utf-8');
  return await services.Ecchi.generator.EcchiGenerator.generate(input)
}

export class EcchiGenerator {
  private nextDocumentId: number = 0;
  constructor(private readonly services: EcchiServices) {}
  async generate(ecchiFileContent: string) {
    const metaData = this.services.LanguageMetaData;
    const documentBuilder = this.services.shared.workspace.DocumentBuilder;
    const uri = URI.parse(`file:///${this.nextDocumentId++}${metaData.fileExtensions[0] ?? ''}`);
    const document = this.services.shared.workspace.LangiumDocumentFactory.fromString<Model>(ecchiFileContent, uri);
    this.services.shared.workspace.LangiumDocuments.addDocument(document);
    await documentBuilder.build([document], { validation: true });
    try {
      return this.generateFromModel(document.parseResult.value);
    } finally {
      await documentBuilder.update([], [uri]);
    }
  }
  private generateFromModel(model: Model) {
    const { concepts, user } = buildDomain(model);
    const dts = `${this.generateImports()}

${this.generateTypes(concepts.instances, concepts.map)}

${this.generateReflection(concepts.instances, concepts.hierarchy)}

${this.generateUser(user)}

${this.generateSubjectActions(model.elements.filter(isSubjectDefinition))}
`;
    return dts;
  }
  generateUser(user: ConceptDefinition | undefined) {
    return `export type $UserType = ${user?.name};`;
  }
  private getSubjectActions(member: SubjectDefinition) {
    const parents: Record<string, string|undefined> = Object.fromEntries(member.members.map(m => [m.name, m.superAction?.ref?.name] as const));
    const children: Record<string, string[]> = Object.fromEntries(Object.entries(parents).map(([name]) => [name, [] as string[]] as const));
    for (const [child, parent] of Object.entries(parents).filter(([_, parent]) => parent !== undefined)) {
      children[parent!].push(child);
    }
    return {
      parents,
      children
    };
  }
  generateSubjectActions(subjects: SubjectDefinition[]) {
    return `export const $SubjectActions = {
  ${subjects.map(subject => {
    const { children, parents } = this.getSubjectActions(subject);
    const type = Object.keys(parents).map(a => `'${a}'`).join('|');
    const nestedSets = new Map<string, NestedSetElement>();
    let counter = 0;
    function visit(node: string) {
      const left = counter++;
      for (const child of children[node]) {
        visit(child);
      }
      const right = counter++;
      nestedSets.set(node, [
        left,
        right
      ]);
    }
    for (const node of Object.entries(parents).filter(([_, parent]) => parent === undefined).map(([action]) => action)){
      visit(node);
    }
    return `${subject.name}: ["${subject.type?.ref?.name}", new SubjectActions<${type}>({
    ${Object.keys(parents).map((action, index) => {
        const [left, right] = nestedSets.get(action)!;
        return `${action}: [[${left}, ${right}],  ${index}]`;
      }).join(',\n    ')}
  })]`; 
  }).join(',\n  ')}
} satisfies SubjectActionsBase<$Types>;    
`;
  }
  private generateReflection(concepts: ConceptDefinition[], nestedSets: Map<ConceptDefinition, NestedSetElement>) {
    return `export const $Reflection = new Reflection<$Types>({
  ${concepts.map(concept => {
  const set = nestedSets.get(concept)!;
  return `${concept.name}: [${set[0]},  ${set[1]}],`
}).join('\n  ')}
});`;
  }

  public generateTypes(concepts: ConceptDefinition[], trees: Map<string, Tree<ConceptDefinition>>) {
    function visit(concept: ConceptDefinition) {
      const subTypes: string = trees.get(concept.name)!.children.map(c => visit(c.content)).join('|');
      return `"${concept.name}"${subTypes.length > 0 ? `|${subTypes}` : ''}`;
    }
    return concepts.map(type => { 
      return `interface ${type.name}${type.superConcept ? ` extends ${type.superConcept.ref?.name}` : ''} {
  $type: ${visit(type)};
  ${type.members.map(member => `${member.name}: ${this.generateTypeReference(member.type)};`).join('\n  ')}
}`;
}).join('\n')+`

export type $Types = {
  ${concepts.map(type => {
  return `${type.name}: ${type.name},`;
}).join('\n  ')}
}`;
  }
  private generateTypeReference(type: TypeReference): string {
    switch (type.$type) {
      case 'BooleanType': return 'boolean';
      case 'NumberType': return 'number';
      case 'NullType': return 'null';
      case 'StringType': return 'string';
      case 'ConceptReference': return type.type.ref!.name;
      default: assertUnreachable(type);
    }
  }
  private generateImports() {
    return `import { Reflection, RoleRules, SubjectActions, SubjectActionsBase, not } from "@ecchi-js/core";`;
  }
}