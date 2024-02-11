import { beforeEach, describe, expect, test } from "vitest";
import { createEcchiServices } from "../../src/language/ecchi-module.js";
import { EmptyFileSystem } from "langium";
import { clearDocuments, parseHelper } from "langium/test";
import { InterfaceDefinition, Model, RoleDefinition, SubjectDefinition, UserDefinition } from "../../src/language/generated/ast.js";
import { assertNoErrors } from "../utils.js";
import { SelectSingle } from "../../src/language/generated/ast.js";

describe("Cross references", () => {
  const services = createEcchiServices(EmptyFileSystem);
  const locator = services.Ecchi.workspace.AstNodeLocator;
  const parse = parseHelper<Model>(services.Ecchi);

  beforeEach(() => {
      clearDocuments(services.Ecchi);
  });

  test("Scoping", async () => {
    const document = await parse(`
    interface UserType { id: number }
    interface ArticleType { author: UserType }
    user of UserType {
      subject Article of ArticleType {
        action read
        action edit extends read
      }
      role NormalUser {
        for Article {
          allow read when user.id == subject.author.id
        }
      }
    }
    interface User2Type extends UserType {}
    `);
    assertNoErrors(document);
    const model = document.parseResult.value;
    const userType = locator.getAstNode<InterfaceDefinition>(model, 'elements@0');
    const articleType = locator.getAstNode<InterfaceDefinition>(model, 'elements@1');
    const userDefinition = locator.getAstNode<UserDefinition>(model, 'elements@2');
    const user2Type = locator.getAstNode<InterfaceDefinition>(model, 'elements@3');
    expect(userDefinition?.type.ref).toBe(userType);
    const subjectDefinition = userDefinition?.members[0] as SubjectDefinition;
    const roleDefinition = userDefinition?.members[1] as RoleDefinition;
    expect(subjectDefinition.type.ref).toBe(articleType);
    expect(subjectDefinition.members[1].superAction?.ref).toBe(subjectDefinition.members[0]);
    expect(roleDefinition.members[0].subject.ref).toBe(subjectDefinition);
    expect((roleDefinition.members[0].members[0].body as SelectSingle).action.ref).toBe(subjectDefinition.members[0]);
    expect(user2Type?.superInterface?.ref).toBe(userType);
  });
});