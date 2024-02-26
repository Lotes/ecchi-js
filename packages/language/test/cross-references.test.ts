import { beforeEach, describe, expect, test } from "vitest";
import { createEcchiServices } from "../src/ecchi-module.js";
import { EmptyFileSystem } from "langium";
import { clearDocuments, parseHelper } from "langium/test";
import { ConceptDefinition, Model, RoleDefinition, SubjectDefinition, UserDeclaration } from "../src/generated/ast.js";
import { assertNoErrors } from "./utils.js";

describe("Cross references", () => {
  const services = createEcchiServices(EmptyFileSystem);
  const locator = services.Ecchi.workspace.AstNodeLocator;
  const parse = parseHelper<Model>(services.Ecchi);

  beforeEach(() => {
      clearDocuments(services.Ecchi);
  });

  test("Scoping", async () => {
    const document = await parse(`
    use UserType as user
    concept UserType { id: number }
    concept ArticleType { author: UserType }
    subject Article of ArticleType {
      action read
      action edit extends read
    }
    role NormalUser {
      for Article {
        when user.id == subject.author.id {
          allow read 
        }
      }
    }
    concept User2Type extends UserType {}
    `);
    assertNoErrors(document);
    const model = document.parseResult.value;
    const userDefinition = model.userDeclaration as UserDeclaration;
    const userType = locator.getAstNode<ConceptDefinition>(model, 'elements@0')!;
    const articleType = locator.getAstNode<ConceptDefinition>(model, 'elements@1')!;
    const subjectDefinition = locator.getAstNode<SubjectDefinition>(model, 'elements@2')!;
    const roleDefinition =  locator.getAstNode<RoleDefinition>(model, 'elements@3')!;
    const user2Type = locator.getAstNode<ConceptDefinition>(model, 'elements@4')!;
    expect(userDefinition?.type.ref).toBe(userType);
    expect(subjectDefinition.type.ref).toBe(articleType);
    expect(subjectDefinition.members[1].superAction?.ref).toBe(subjectDefinition.members[0]);
    expect(roleDefinition.members[0].subject.ref).toBe(subjectDefinition);
    expect(user2Type?.superConcept?.ref).toBe(userType);
  });
});