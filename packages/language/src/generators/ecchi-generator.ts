import { URI, assertUnreachable } from "langium";
import { EcchiServices } from "../ecchi-module.js";
import { InterfaceDefinition, Model, SubjectDefinition, TypeReference, UserDefinition, UserMemberDefinition, isInterfaceDefinition, isSubjectDefinition, isUserDefinition } from "../generated/ast.js";
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
    const { interfaces, nestedSets, trees } = this.getInterfaces(model);
    const dts = `${this.generateImports()}

${this.generateTypes(interfaces, trees)}

${this.generateReflection(interfaces, nestedSets)}

${this.generateUser(model.elements.filter(isUserDefinition))}

${this.generateSubjectActions(model.elements.filter(isUserDefinition).flatMap(u => u.members))}
`;
    return dts;
  }
  generateUser(users: UserDefinition[]) {
    return `export type $UserType = ${users[0]?.type?.ref?.name};`;
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
  generateSubjectActions(members: UserMemberDefinition[]) {
    const subjects = members.filter(isSubjectDefinition);
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
    return `${subject.name}: ["${subject.type.ref?.name}", new SubjectActions<${type}>({
    ${Object.keys(parents).map((action, index) => {
        const [left, right] = nestedSets.get(action)!;
        return `${action}: [[${left}, ${right}],  ${index}]`;
      }).join(',\n    ')}
  })]`; 
  }).join('\n  ')}
} satisfies SubjectActionsBase<$Types>;    
`;
  }
  private generateReflection(interfaces: InterfaceDefinition[], nestedSets: Map<string, NestedSetElement>) {
    return `export const $Reflection = new Reflection<$Types>({
  ${interfaces.map(iface => {
  const set = nestedSets.get(iface.name)!;
  return `${iface.name}: [${set[0]},  ${set[1]}],`
}).join('\n  ')}
});`;
  }
  private getInterfaces(model: Model) {
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
      if (iface.superInterface) {
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
    return { interfaces, nestedSets, trees: map };
  }

  public generateTypes(interfaces: InterfaceDefinition[], trees: Map<string, TypeTree>) {
    function visit(name: string) {
      const subTypes: string = trees.get(name)!.children.map(c => visit(c.$type)).join('|');
      return `"${name}"${subTypes.length > 0 ? `|${subTypes}` : ''}`;
    }
    return interfaces.map(type => { 
      return `interface ${type.name}${type.superInterface ? ` extends ${type.superInterface.ref?.name}` : ''} {
  $type: ${visit(type.name)};
  ${type.members.map(member => `${member.name}: ${this.generateTypeReference(member.type)};`).join('\n  ')}
}`;
}).join('\n')+`

export type $Types = {
  ${interfaces.map(type => {
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