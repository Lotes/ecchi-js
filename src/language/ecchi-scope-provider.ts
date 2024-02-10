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
  EMPTY_SCOPE,
} from "langium";
import { EcchiAstType, InterfaceDefinition, TypeDefinitionReference, TypeReference, isDefinition, isInterfaceDefinition, isModel, isObjectType, isTypeDefinition } from "./generated/ast.js";
import { inferType } from "./type-system/ecchi-infer-type.js";

export class EcchiScopeProvider extends DefaultScopeProvider {
  constructor(services: LangiumServices) {
    super(services);
  }
  override getScope(referenceInfo: ReferenceInfo): Scope {
    const container =
      referenceInfo.container as AstNodeTypesWithCrossReferences<EcchiAstType>;
    const referenceType = this.reflection.getReferenceType(referenceInfo);
    switch (container.$type) {
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
              container.$container.$container.members
            );
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "InterfaceDefinition":
        {
          const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "superInterface") {
            return this.createScopeFromNodes(
              container.$container.elements.filter(isInterfaceDefinition)
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
            if(isObjectType(receiverType)) {
              return this.createScopeFromNodes(receiverType.members);
            }
            return this.getGlobalScope(referenceType, referenceInfo);
          } else {
            assertUnreachable(property);
          }
        }
        break;
      case "TypeDefinitionReference": {
        const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "type") {
            return this.getMembers1(container);;
          } else {
            assertUnreachable(property);
          }
      }
      break;
      case "SubjectDefinition":
      case "UserDefinition": {
        const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "type") {
            return this.createScopeForNodes(getContainerOfType(container, isModel)!.elements.filter(isDefinition));
          } else {
            assertUnreachable(property);
          }
      }
      break;
      case "SelectSingle":{
        const property =
            referenceInfo.property as CrossReferencesOfAstNodeType<
              typeof container
            >;
          if (property === "action") {
            return container.$container.$container.subject.ref
              ? this.createScopeForNodes(container.$container.$container.subject.ref?.members)
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
  private getMembers1(expression: TypeDefinitionReference): Scope {
    const definition = expression.type.ref;
    if(!definition) {
      return EMPTY_SCOPE;
    } else if(isInterfaceDefinition(definition)) {
      return this.getInterfaceMembers(definition);
    } else if(isTypeDefinition(definition)) {
      return this.getMembers2(definition.expression);
    } else {
      assertUnreachable(definition);
    }
  }
  private getInterfaceMembers(definition: InterfaceDefinition): Scope {
    return this.createScopeFromNodes(definition.members, definition.superInterface?.ref ? this.getInterfaceMembers(definition.superInterface.ref) :undefined);
  }
  private getMembers2(expression: TypeReference): Scope {
    switch (expression.$type) {
      case "ArrayType":
      case "BooleanType":
      case "NullType":
      case "NumberType":
      case "StringType":
        return EMPTY_SCOPE;
      case "TypeDefinitionReference":
        return this.getMembers1(expression);
      case "ObjectType":
        return this.createScopeFromNodes(expression.members);
      default:
        assertUnreachable(expression);
    }
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
