import {
  DefaultScopeProvider,
  ReferenceInfo,
  Scope,
  CrossReferencesOfAstNodeType,
  AstNodeTypesWithCrossReferences,
  assertUnreachable,
  NamedAstNode,
  getContainerOfType,
  LangiumServices,
  URI,
  getDocument
} from "langium";
import {
  ConceptDefinition,
  EcchiAstType,
  isConceptDefinition,
  isConceptReference,
  isForMember,
  isModel,
  isSubjectDefinition,
} from "./generated/ast.js";
import { inferType } from "./ecchi-infer-type.js";

export class EcchiScopeProvider extends DefaultScopeProvider {
  constructor(services: LangiumServices) {
    super(services);
  }
  override getScope(referenceInfo: ReferenceInfo): Scope {
    const container =
      referenceInfo.container as AstNodeTypesWithCrossReferences<EcchiAstType>;
    const referenceType = this.reflection.getReferenceType(referenceInfo);
    switch (container.$type) {
      case "TypeOfExpression":
        return this.createScopeFromNodes(
          getContainerOfType(container, isModel)!.elements.filter(
            isConceptDefinition
          )
        );
      case "ActionMember":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "superAction") {
            return this.createScopeFromNodes(container.$container.members);
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "ForMember":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "subject") {
            return this.createScopeFromNodes(
              container.$container.$container.elements.filter(isSubjectDefinition)
            );
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "ConceptDefinition":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "superInterface") {
            return this.createScopeFromNodes(
              container.$container.elements.filter(isConceptDefinition)
            );
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "PropertyMemberAccess":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "member") {
            const receiverType = inferType(container.receiver);
            if (isConceptReference(receiverType) && receiverType.type.ref) {
              return this.createScopeFromNodes(receiverType.type.ref.members);
            }
            return this.getGlobalScope(referenceType, referenceInfo);
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "ConceptReference":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "type") {
            return this.getTypeDefs(getDocument(container).uri);
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "SubjectDefinition":
      case "UserDeclaration":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "type") {
            return this.createScopeForNodes(
              getContainerOfType(container, isModel)!.elements.filter(
                isConceptDefinition
              )
            );
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "PermissionAction":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "action") {
            const subject = getContainerOfType(container, isForMember)!.subject.ref;
            return subject
              ? this.createScopeForNodes(
                  subject.members
                )
              : this.getGlobalScope(referenceType, referenceInfo);
          } else {
            assertUnreachable(property);
          }
        }
        break;
      default:
        assertUnreachable(container);
    }
  }
  private getTypeDefs(uri: URI): Scope {
    const set = new Set<string>([uri.toString()]);
    return this.createScope([
      ...this.indexManager.allElements(ConceptDefinition, set)
    ]);
  }

  private createScopeFromNodes(
    nodes: NamedAstNode[],
    outerScope?: Scope
  ): Scope {
    return this.createScope(
      nodes.map((node) => this.descriptions.createDescription(node, node.name)),
      outerScope
    );
  }
}
