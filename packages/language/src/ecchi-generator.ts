import { URI, assertUnreachable } from "langium";
import { EcchiServices, createEcchiServices } from "./ecchi-module.js";
import {
  ConceptDefinition,
  Model,
  SubjectDefinition,
  TypeReference,
} from "./generated/ast.js";
import { EmptyFileSystem } from "langium";
import { readFile } from "fs/promises";
import {
  ConceptMap,
  EcchiGeneratorModel,
  SubjectData,
  buildGeneratorModel,
} from "./ecchi-generator-model.js";
import { OpcodeElement } from "./ecchi-generator-conditions.js";

export async function generate(fileName: string) {
  const services = createEcchiServices(EmptyFileSystem);
  const input = await readFile(fileName, "utf-8");
  const generator = services.Ecchi.generator.EcchiGenerator;
  const model = await generator.parse(input);
  const pkg = await generator.build(model);
  return await generator.generate(pkg);
}

export class EcchiGenerator {
  private nextDocumentId: number = 0;
  constructor(private readonly services: EcchiServices) {}
  async parse(ecchiFileContent: string) {
    const metaData = this.services.LanguageMetaData;
    const documentBuilder = this.services.shared.workspace.DocumentBuilder;
    const uri = URI.parse(
      `file:///${this.nextDocumentId++}${metaData.fileExtensions[0] ?? ""}`
    );
    const document =
      this.services.shared.workspace.LangiumDocumentFactory.fromString<Model>(
        ecchiFileContent,
        uri
      );
    this.services.shared.workspace.LangiumDocuments.addDocument(document);
    await documentBuilder.build([document], { validation: true });
    try {
      return document.parseResult.value;
    } finally {
      await documentBuilder.update([], [uri]);
    }
  }
  async build(model: Model) {
    return buildGeneratorModel(model);
  }
  toJSType(type: TypeReference): string {
    switch (type.$type) {
      case "BooleanType":
        return "boolean";
      case "NumberType":
        return "number";
      case "NullType":
        return "null";
      case "StringType":
        return "string";
      case "ArrayType":
        return `${this.toJSType(type.type)}[]`;
      case "ConceptReference":
        return type.type.ref!.name;
      default:
        assertUnreachable(type);
    }
  }
  async generate({ concepts, user, subjects }: EcchiGeneratorModel) {
    return `${this.generateImports()}

${this.generateTypes(concepts)}

${this.generateReflection(concepts)}

${this.generateUser(user)}

${this.generateSubjectActions(subjects)}
`;
  }
  generateConditions(pkg: EcchiGeneratorModel): string {
    return [...pkg.roles.entries()]
      .map(([role, data]) => {
        return `${this.generateImports()}

${this.generateTypes(pkg.concepts)}
${this.generateReflection(pkg.concepts)}
${this.generateUser(pkg.user)}

export function ${role.name}(user: $UserType) {
  const commonExpressions = [
    ${data.expressions.map(e => this.generateExpression(e)).join(",\n    ")}
  ] as const;
  return {
    ${role.members
      .map((member) => {
        const subjectName = member.subject.ref!.name;
        const subjectRules = data.rules.get(member.subject.ref!)!;
        const subjectType = member.subject.ref!.type.ref!.name;
        return `${subjectName}: (subject: ${subjectType}): [boolean, 'allow'|'forbid', string[]][] => {
      const subjectExpressions = [
        ${subjectRules.expressions.map(e => this.generateExpression(e)).join(",\n        ")}
      ] as const;
  
      return [
        ${[...subjectRules.rules]
          .map((action) => {
            return `[${action.condition <  0? `subjectExpressions[${-action.condition}]` :  `commonExpressions[${action.condition}]`}(), '${
              action.mode
            }', [${action.actions.map((e) => `'${e.name}'`).join(", ")}]]`;
          })
          .join(",\n        ")}
      ];
    }`;
      })
      .join(",\n    ")}
  }
}`;
      })
      .join(",\n    ");
  }
  generateExpression(expression: OpcodeElement): string {
    let code = "";
    const op = expression.code;
    function get(operandIndex: number) {
      return operandIndex > 0 
        ? `commonExpressions[${operandIndex}]()`
        : `subjectExpressions[${-operandIndex}]()`;
    }
    switch (op.op) {
      case "null":
        code = `null`;
        break;
      case "boolean":
        code = `${op.value}`;
        break;
      case "built-in":
        code = `${op.object}`;
        break;
      case "binary":
        code = `${get(op.leftOperandIndex)} ${op.operator} ${get(op.rightOperandIndex)}`;
        break;
      case "string":
        code = `"${op.value.replaceAll('"', '\\"')}"`;
        break;
      case "number":
        code = `${op.value}`;
        break;
      case "unary":
        code = `${op.operator}${get(op.operandIndex)}`;
        break;
      case "get-property":
        code = `${get(op.receiverOperandIndex)}.${op.property}`;
        break;
      case "is":
        code = `$Reflection.isSubTypeOf(${get(op.operandIndex)}.$type, '${op.type}')`;
        break;
      case "array-get":
        code = `${get(op.receiverOperandIndex)}[${get(op.indexOperandIndex)}]`;
        break;
      default:
        assertUnreachable(op);
    }
    const type = this.toJSType(expression.type);
    return `(): ${type} => ${code}`;
  }
  generateUser(user: ConceptDefinition | undefined) {
    return `export type $UserType = ${user?.name};`;
  }
  generateSubjectActions(map: Map<SubjectDefinition, SubjectData>) {
    return `export const $SubjectActions = {
  ${[...map.keys()]
    .map((subject) => {
      const { parents, hierarchy: nestedSets, instances } = map.get(subject)!;
      const type = [...parents.keys()].map((a) => `'${a}'`).join("|");
      return `${subject.name}: ["${
        subject.type?.ref?.name
      }", new SubjectActions<${type}>({
    ${[...instances.entries()]
      .map(([action, tree], index) => {
        const [left, right] = nestedSets.get(tree.content)!;
        return `${action}: [[${left}, ${right}],  ${index}]`;
      })
      .join(",\n    ")}
  })]`;
    })
    .join(",\n  ")}
} satisfies SubjectActionsBase<$Types>;    
`;
  }
  private generateReflection(concepts: ConceptMap) {
    return `export const $Reflection = new Reflection<$Types>({
  ${[...concepts.entries()]
    .map(([concept, { nestedSet: set }]) => {
      return `${concept.name}: [${set[0]},  ${set[1]}],`;
    })
    .join("\n  ")}
});`;
  }

  public generateTypes(concepts: ConceptMap) {
    function visit(concept: ConceptDefinition) {
      const subTypes: string = concepts
        .get(concept)!
        .children.map(visit)
        .join("|");
      return `"${concept.name}"${subTypes.length > 0 ? `|${subTypes}` : ""}`;
    }
    return (
      [...concepts.keys()]
        .map((type) => {
          return `interface ${type.name}${
            type.superConcept ? ` extends ${type.superConcept.ref?.name}` : ""
          } {
  $type: ${visit(type)};
  ${type.members
    .map(
      (member) => `${member.name}: ${this.generateTypeReference(member.type)};`
    )
    .join("\n  ")}
}`;
        })
        .join("\n") +
      `

export type $Types = {
  ${[...concepts.keys()]
    .map((type) => {
      return `${type.name}: ${type.name},`;
    })
    .join("\n  ")}
}`
    );
  }
  private generateTypeReference(type: TypeReference): string {
    switch (type.$type) {
      case "BooleanType":
        return "boolean";
      case "NumberType":
        return "number";
      case "NullType":
        return "null";
      case "StringType":
        return "string";
      case "ArrayType":
        return `${this.generateTypeReference(type.type)}[]`;
      case "ConceptReference":
        return type.type.ref!.name;
      default:
        assertUnreachable(type);
    }
  }
  private generateImports() {
    return `import { Reflection, RoleRules, SubjectActions, SubjectActionsBase, not } from "@ecchi-js/core";`;
  }
}
