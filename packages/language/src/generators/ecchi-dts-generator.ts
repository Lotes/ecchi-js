import { URI, assertUnreachable } from "langium";
import { EcchiServices } from "../ecchi-module.js";
import { Model, TypeReference, isInterfaceDefinition } from "../generated/ast.js";

export class EcchiDtsGenerator {
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
    const dts = `${this.generateImports()}
${this.generateTypes(model)}
`;
    return dts;
  }
  private generateTypes(model: Model) {
    return model.elements.filter(isInterfaceDefinition).map(type => {
      return `export interface ${type.name}${type.superInterface ? ` extends ${type.superInterface.ref?.name}` : ''} {
  ${type.members.map(member => `${member.name}: ${this.generateTypeReference(member.type)};`).join('\n  ')
}`;
    });
  }
  private generateTypeReference(type: TypeReference): string {
    switch (type.$type) {
      case 'BooleanType': return 'boolean';
      case 'NumberType': return 'number';
      case 'StringType': return 'string';
      case 'TypeDefinitionReference': return type.type.ref!.name;
      case 'ArrayType': return `${this.generateTypeReference(type.type)}[]`;
      case "NullType": return 'null';
      case "ObjectType": return `{
  ${type.members.map(member => `${member.name}: ${this.generateTypeReference(member.type)};`).join('\n  ')
}`;
      default: assertUnreachable(type);
    }
  }
  private generateImports() {
    return `import { Reflection, RoleRules, SubjectActions, SubjectActionsBase, not } from "../src/index.js";`;
  }
}