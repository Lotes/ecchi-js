import { URI, assertUnreachable } from "langium";
import { EcchiServices } from "../ecchi-module.js";
import { Model, TypeReference, isInterfaceDefinition } from "../generated/ast.js";
import { NestedSetElement } from "@ecchi-js/core";

interface TypeTree {
  $type: string;
  children: TypeTree[];
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
   const dts = `${this.generateImports()}

${this.generateTypes(model)}

${this.generateReflection(model)}
`;
    return dts;
  }
  private generateReflection(model: Model) {
    const map = new Map<string, TypeTree>();
    const nestedSets = new Map<string, NestedSetElement>();
    const interfaces = model.elements.filter(isInterfaceDefinition);
    const roots: TypeTree[] = [];
    for (const iface of interfaces) {
      map.set(iface.name, {
        $type: iface.name,
        children: []
      });
    }
    for (const iface of interfaces) {
      const node = map.get(iface.name)!;
      if(iface.superInterface) {
        const superNode = map.get(iface.superInterface.ref!.name)!;
        superNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
    let counter = 0;
    function visit(node: TypeTree) {
      const left = counter++;
      for (const child of node.children) {
        visit(child);
      }
      const right = counter++;
      nestedSets.set(node.$type, [
        left,
        right
      ]);
    }
    for (const node of roots) {
      visit(node);
    }
    return `export const $Reflection = new Reflection<$Types>({
  ${interfaces.map(iface => {
  const set = nestedSets.get(iface.name)!;
  return `${iface.name}: [${set[0]},  ${set[1]}],`
}).join('\n  ')}
});`;
  }
  public generateTypes(model: Model) {
    return model.elements.filter(isInterfaceDefinition).map(type => `interface ${type.name}${type.superInterface ? ` extends ${type.superInterface.ref?.name}` : ''} {
  $type: "${type.name}";
  ${type.members.map(member => `${member.name}: ${this.generateTypeReference(member.type)};`).join('\n  ')}
}`).join('\n  ')+`

export type $Types = {
  ${model.elements.filter(isInterfaceDefinition).map(type => {
  return `${type.name}: ${type.name},`;
}).join('\n  ')}
}`;
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
    return `import { Reflection, RoleRules, SubjectActions, SubjectActionsBase, not } from "@ecchi-js/core";`;
  }
}