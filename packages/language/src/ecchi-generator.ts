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
  return {
    ${role.members
      .map((member) => {
        const subjectName = member.subject.ref!.name;
        const booleanIndices = data.expressions
          .map((e, index) => [e.type.$type, index] as const)
          .filter((e) => e[0] === "BooleanType")
          .map((e) => e[1])
          .join("|");
        const subjectType = member.subject.ref!.type.ref!.name;
        return `${subjectName}: (subject: ${subjectType}): [boolean, 'allow'|'forbid', string[]][] => {
      function condition(user: $UserType, subject: ${subjectType}, index: ${booleanIndices}): boolean {
        const expressions = [
          ${data.expressions
          .map((expression) => {
            let code = "";
            const op = expression.code;
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
                code = `expressions[${op.leftOperandIndex}]() ${op.operator} expressions[${op.rightOperandIndex}]()`;
                break;
              case "string":
                code = `"${op.value.replaceAll('"', '\\"')}"`;
                break;
              case "number":
                code = `${op.value}`;
                break;
              case "unary":
                code = `${op.operator}expressions[${op.operandIndex}]()`;
                break;
              case "get-property":
                code = `expressions[${op.receiverOperandIndex}]().${op.property}`;
                break;
              case "is":
                code = `$Reflection.isSubTypeOf(expressions[${op.operandIndex}]().$type, '${op.type}')`;
                break;
              case "array-get":
                code = `expressions[${op.receiverOperandIndex}]()[expressions[${op.indexOperandIndex}]()]`;
                break;
              default:
                assertUnreachable(op);
            }
            const type = this.toJSType(expression.type);
            return `(): ${type} => ${code}`;
          })
          .join(",\n          ")}
        ] as const;
        return condition[index];
      }
  
      return [
        ${[...data.rules.get(member.subject.ref!)!]
          .map((action) => {
            return `[condition(user, subject, ${action.condition}), '${
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
