import { URI, assertUnreachable } from "langium";
import { EcchiServices, createEcchiServices } from "./ecchi-module.js";
import {
  ActionMember,
  ConceptDefinition,
  Model,
  TypeReference,
} from "./generated/ast.js";
import { EmptyFileSystem } from "langium";
import { readFile } from "fs/promises";
import {
  ConceptMap,
  EcchiGeneratorModel,
  buildGeneratorModel,
} from "./ecchi-generator-model.js";
import { OpcodeElement } from "./ecchi-generator-conditions.js";
import { Bitmask } from "./ecchi-bitmasks.js";

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
  async generate(model: EcchiGeneratorModel) {
    const { concepts, user } = model;
    return `${this.generateImports()}

${this.generateTypes(concepts)}

${this.generateReflection(concepts)}

${this.generateUser(user)}

${this.generatePermissions(model)}
`;
  }
  generatePermissions(model: EcchiGeneratorModel) {
    const { roles, subjects } = model;
    return `
export type $Role = ${roles.roles.map((role) => {
  return `'${role.name}'`;
}).join("|")};
export type $Subject = ${[...subjects.entries()].map(([subject, data]) => {
  return `'${subject.name}'`;
}).join("|")};
export type $Subjects = {
  ${[...subjects.entries()].map(([subject, data]) => {
    return `${subject.name}: ${subject.type.ref!.name};`;
  }).join('\n  ')}
};
export type $Actions = {
  ${[...subjects.entries()].map(([subject, data]) => {
    return `${subject.name}: ${subject.members.map(a => `'${a.name}'`).join('|')};`;
  }).join('\n  ')}
};

export type CanOptions = {
  I: $UserType;
  not?: boolean;
  actingAs?: $Role[];
} & (${[...subjects.entries()].map(([subject, data]) => {
  return `{
  when: '${subject.name}';
  subject: ${subject.type.ref!.name};
  doWhat: $Actions['${subject.name}'];
  allowing?: $Actions['${subject.name}'][];
  forbiding?: $Actions['${subject.name}'][];
}`;
}).join(" |  ")});

export function can({ I: user, not = false, actingAs = [], when, subject, allowing = [], forbiding = [], doWhat }: CanOptions) {
  const commonExpressions = [
    ${roles.expressions.map((e) => this.generateExpression(e)).join(",\n    ")}
  ] as const;

  const subjectHandlers: { [K in $Subject]: (subject: $Subjects[K], allowed: $Actions[K], forbidden: $Actions[K]) => boolean} = {
    ${[...subjects.entries()].map(([subject, data]) => {
    const subjectRules = roles.subjects.get(subject)!;
    return `${subject.name}(subject: ${subject.type.ref!.name}, allowed: $Actions['${subject.name}'], forbidden: $Actions['${subject.name}']) {
      const subjectExpressions = [
        ${subjectRules.expressions.map((e) => this.generateExpression(e)).join(",\n        ")}
      ] as const;
      const actionBits = {
        ${[...data.actions.entries()].map(([action, bitmasks]) => {
          return `${action.name}: {
          allow: [${bitmasks.allow.byteIndex}, ${bitmasks.allow.bitIndex}],
          forbid: [${bitmasks.forbid.byteIndex}, ${bitmasks.forbid.bitIndex}],
        },`;
        }).join("\n        ")}
      };
      const roleHandlers: Record<$Role, (() => [boolean, number[]])[]> = {
        ${roles.roles.map((role) => {
          const rules = roles.subjects.get(subject)!.rules.get(role) ?? [];
          return `${role.name}: [
          ${rules.map((r) => {
              const masks = r.actions.map(a => subjects.get(subject)!.actions.get(a)![r.mode].bitmask);
              const finalMask = Bitmask.or<ActionMember>(...masks);
              return `() => [${this.getExpression(r.condition)}, ${finalMask.print()}]`;
          }).join(",\n          ")}
        ],`;
        }).join("\n        ")}
      };
      const { allow, forbid } = actionBits[doWhat];
      const mask = actingAs.flatMap(role => roleHandlers[role])
        .map(item => item())
        .filter(([condition, _]) => condition)
        .map(([_, mask]) => mask)
        .reduce((lhs, rhs) => or(lhs, rhs));
      return mask.length > 0 
        && (mask[forbid[0]] & forbid[1]) === 0
        && (mask[allow[0]] & allow[1]) !== 0;
    },`;
  }).join('\n    ')}
  };
  return subjectHandlers[when](subject as any, (allowing ?? []) as any, (forbiding ?? []) as any);
}`;
  }
  getExpression(operandIndex: number) {
    return operandIndex > 0 
      ? `commonExpressions[${operandIndex}]()`
      : `subjectExpressions[${-operandIndex}]()`;
  }
  generateExpression(expression: OpcodeElement): string {
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
        if(op.operator === 'in') {
          code = `${this.getExpression(op.rightOperandIndex)}.includes(${this.getExpression(op.leftOperandIndex)})`;
        } else {
          code = `${this.getExpression(op.leftOperandIndex)} ${op.operator} ${this.getExpression(op.rightOperandIndex)}`;
        }
        break;
      case "string":
        code = `"${op.value.replaceAll('"', '\\"')}"`;
        break;
      case "number":
        code = `${op.value}`;
        break;
      case "unary":
        code = `${op.operator}${this.getExpression(op.operandIndex)}`;
        break;
      case "get-property":
        code = `${this.getExpression(op.receiverOperandIndex)}.${op.property}`;
        break;
      case "is":
        code = `$Reflection.isSubTypeOf(${this.getExpression(op.operandIndex)}.$type, '${op.type}')`;
        break;
      case "array-get":
        code = `${this.getExpression(op.receiverOperandIndex)}[${this.getExpression(op.indexOperandIndex)}]`;
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
    return `import { Reflection, or } from "@ecchi-js/core";`;
  }
}
