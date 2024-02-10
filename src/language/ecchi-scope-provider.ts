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
} from "langium";
import { EcchiAstType, InterfaceDefinition, PropertyMember, PropertyMemberAccess, RootMember, isDefinition, isForMember, isInterfaceDefinition, isModel, isTypeDefinitionReference, isUserDefinition } from "./generated/ast.js";

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
            switch(container.receiver.$type) {
              case "RootMember": {
                let type: InterfaceDefinition|undefined = undefined;
                if((container.receiver as RootMember).isSubjectRoot) {
                  type = getContainerOfType(container, isForMember)?.subject.ref?.type.ref;
                } else {
                  type = getContainerOfType(container, isUserDefinition)?.type.ref;
                }
                if(!type) {
                  return this.getGlobalScope(referenceType, referenceInfo);
                }
                const members = this.getMembersOfInterface(type);
                return this.createScopeForNodes(members);
              }
              break;              
              case "PropertyMemberAccess": {
                const memberType = (container.receiver as PropertyMemberAccess).member.ref?.type;
                if(memberType && isTypeDefinitionReference(memberType)) {
                  const unrefMemberType = memberType.type.ref;
                  if(unrefMemberType && isInterfaceDefinition(unrefMemberType)) {
                    return this.createScopeForNodes(unrefMemberType.members);
                  }
                }
              }
              break;
              case "ArrayMemberAccess": {
              }
              break;
              case "Parentheses": {

              }
              break;
              case "BinaryExpression":
              case "BooleanLiteral":
              case "UnaryExpression":
              case "NullLiteral":
              case "NumberLiteral":
              case "StringLiteral": {
                //nothing
              }
              break;
              default: assertUnreachable(container.receiver);
            }
          }
          return this.getGlobalScope(referenceType, referenceInfo);
        }
        break;
      case "SubjectDefinition":
      case "TypeDefinitionReference":
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
  private createScopeFromNodes(
    nodes: NamedAstNode[],
    outerScope?: Scope
  ): Scope {
    return this.createScope(
      nodes.map((node) => this.descriptions.createDescription(node, node.name)),
      outerScope
    );
  }

  private getMembersOfInterface(iface: InterfaceDefinition): PropertyMember[] {
    return iface.superInterface?.ref
      ? this.getMembersOfInterface(iface.superInterface.ref)!.concat(
          iface.members
        )
      : iface.members;
  }
}
