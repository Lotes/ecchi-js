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
import { Opcode, OpcodeElement } from "./ecchi-generator-conditions.js";
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
  actingAs?: $Role[];
  cache?: Cache<Key, any>;
} & (${[...subjects.entries()].map(([subject, data]) => {
  return `{
  when: '${subject.name}';
  subject: ${subject.type.ref!.name};
  doWhat: $Actions['${subject.name}'];
}`;
}).join(" |  ")});

const DefaultCache = new LRUCache<Key, any>(128);

export function can({
  I: user,
  actingAs = [],
  when,
  subject,
  doWhat,
  cache = DefaultCache
}: CanOptions) {
  type Common = readonly [${roles.expressions.map((e) => this.generateTypeReference(e.type)).join(", ")}];
  const commonExpressions = cacheCommonExpressions<Common>([
    ${roles.expressions.map((e) => this.generateCommonExpression(e)).join(",\n    ")}
  ] as const, [user], cache);

  const subjectHandlers: { [K in $Subject]: (subject: $Subjects[K]) => boolean} = {
    ${[...subjects.entries()].map(([subject, data]) => {
    const subjectRules = roles.subjects.get(subject)!;
    return `${subject.name}(subject: ${subject.type.ref!.name}) {
      type Subject = readonly [${subjectRules.expressions.map((e) => this.generateTypeReference(e.type)).join(", ")}];
      const subjectExpressions = cacheSubjectExpressions<Common, Subject>(commonExpressions, [
        ${subjectRules.expressions.map((e) => this.generateSubjectExpression(e)).join(",\n        ")}
      ] as const, [subject], cache);
      const actionBits = {
        ${[...data.actions.entries()].map(([action, bitmasks]) => {
          return `${action.name}: {
          allow: [${bitmasks.allow.byteIndex}, 1 << ${bitmasks.allow.bitIndex}],
          forbid: [${bitmasks.forbid.byteIndex}, 1 << ${bitmasks.forbid.bitIndex}],
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
              return `() => [${this.getOuterExpression(r.condition)}, ${finalMask.print()}]`;
          }).join(",\n          ")}
        ],`;
        }).join("\n        ")}
      };
      const { allow, forbid } = actionBits[doWhat];
      return merge(allow, forbid, actingAs, roleHandlers);
    },`;
  }).join('\n    ')}
  };
  return subjectHandlers[when](subject as any);
}`;
  }
  getInnerExpression(operandIndex: number) {
    return operandIndex > 0 
      ? `commons[${operandIndex}]`
      : `subjects[${-operandIndex}]`;
  }
  getOuterExpression(operandIndex: number) {
    return operandIndex > 0 
      ? `commonExpressions[${operandIndex}]`
      : `subjectExpressions[${-operandIndex}]`;
  }
  generateCommonExpression(expression: OpcodeElement): string {
    const op = expression.code;
    const { code, usesCommon } = this.generateCode(op);
    const type = this.toJSType(expression.type);
    return `(${usesCommon ? 'commons' : ''}): ${type} => ${code}`;
  }
  generateSubjectExpression(expression: OpcodeElement): string {
    const op = expression.code;
    const { code, usesCommon, usesSubject } = this.generateCode(op);
    const type = this.toJSType(expression.type);
    return `(${usesCommon ? 'commons, ' : usesSubject ? '_common, ' : ''}${usesSubject ? 'subjects' : ''}): ${type} => ${code}`;
  }
  private generateCode(op: Opcode): {
    code: string;
    usesCommon: boolean;
    usesSubject: boolean;
  } {
    let usesCommon = false;
    let usesSubject = false;
    let code: string;
    const checkOperandIndex = (index: number) => {
      if (index > 0) {
        usesCommon = true;
      } else {
        usesSubject = true;
      }
    };
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
        checkOperandIndex(op.leftOperandIndex);
        checkOperandIndex(op.rightOperandIndex);
        if (op.operator === 'in') {
          code = `${this.getInnerExpression(op.rightOperandIndex)}.includes(${this.getInnerExpression(op.leftOperandIndex)})`;
        } else {
          code = `${this.getInnerExpression(op.leftOperandIndex)} ${op.operator} ${this.getInnerExpression(op.rightOperandIndex)}`;
        }
        break;
      case "string":
        code = `"${op.value.replaceAll('"', '\\"')}"`;
        break;
      case "number":
        code = `${op.value}`;
        break;
      case "unary":
        checkOperandIndex(op.operandIndex);
        code = `${op.operator}${this.getInnerExpression(op.operandIndex)}`;
        break;
      case "get-property":
        checkOperandIndex(op.receiverOperandIndex);
        code = `${this.getInnerExpression(op.receiverOperandIndex)}.${op.property}`;
        break;
      case "is":
        checkOperandIndex(op.operandIndex);
        code = `$Reflection.isSubTypeOf(${this.getInnerExpression(op.operandIndex)}.$type, '${op.type}')`;
        break;
      case "array-get":
        checkOperandIndex(op.receiverOperandIndex);
        checkOperandIndex(op.indexOperandIndex);
        code = `${this.getInnerExpression(op.receiverOperandIndex)}[${this.getInnerExpression(op.indexOperandIndex)}]`;
        break;
      default:
        assertUnreachable(op);
    }
    return {
      code,
      usesCommon,
      usesSubject,
    };
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
    return `import { Reflection, Cache, LRUCache, cacheCommonExpressions, cacheSubjectExpressions, Key, merge } from "@ecchi-js/core";`;
  }
}
