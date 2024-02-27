import { URI, assertUnreachable } from "langium";
import { EcchiServices, createEcchiServices } from "./ecchi-module.js";
import { ConceptDefinition, Model, SubjectDefinition, TypeReference } from "./generated/ast.js";
import { NestedSetElement } from "@ecchi-js/core";
import { EmptyFileSystem } from "langium";
import { readFile } from "fs/promises";
import { SubjectData, Tree, buildDomain } from "./ecchi-model.js";

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
    const { concepts, user, subjects } = buildDomain(model);
    const typescript = `${this.generateImports()}

${this.generateTypes(concepts.instances, concepts.map)}

${this.generateReflection(concepts.instances, concepts.hierarchy)}

${this.generateUser(user)}

${this.generateSubjectActions(subjects.instances, subjects.map)}
`;
    return typescript;
  }
  generateUser(user: ConceptDefinition | undefined) {
    return `export type $UserType = ${user?.name};`;
  }
  generateSubjectActions(instances: SubjectDefinition[], map: Map<string, SubjectData>) {
    return `export const $SubjectActions = {
  ${instances.map(subject => {
    const {parents, hierarchy: nestedSets, instances} = map.get(subject.name)!;
    const type = [...parents.keys()].map(a => `'${a}'`).join('|');
    return `${subject.name}: ["${subject.type?.ref?.name}", new SubjectActions<${type}>({
    ${[...instances.entries()].map(([action, tree], index) => {
        const [left, right] = nestedSets.get(tree.content)!;
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