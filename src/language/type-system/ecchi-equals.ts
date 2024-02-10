import { assertUnreachable } from "langium";
import { Definition, PropertyMember, TypeReference, isInterfaceDefinition, isTypeDefinition } from "../generated/ast.js";

export function equalTypes(a: TypeReference, b: TypeReference): boolean {
  if (a.$type !== b.$type) {
    return false;
  }

  switch (a.$type) {
    case 'TypeDefinitionReference':
      assert(b.$type === 'TypeDefinitionReference');
      return equalDefinitions(a.type.ref, b.type.ref);
    case 'BooleanType':
    case 'NullType':
    case 'NumberType':
    case 'StringType':
      return true;
    case "ArrayType":
      assert(b.$type === 'ArrayType');
      return equalTypes(a.type, b.type);
    case "ObjectType":
      assert(b.$type === 'ObjectType');
      const zipped = zip(a.members, b.members);
      return a.members.length === b.members.length && Object.keys(zipped).length  === a.members.length && Object.values(zipped).every((a) => equalTypes(a.left!,a.right!));
    default:
      assertUnreachable(a)
  }
}

function assert(condition: boolean): asserts condition {
  if (!condition) {
    throw new Error("Unexpected falsy assertion. ");
  }
}

function equalDefinitions(left: Definition | undefined, right: Definition | undefined): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }
  if (left.$type !== right.$type) {
    return false;
  }
  if(isInterfaceDefinition(left)) {
    return left.name === right.name;    
  } else if(isTypeDefinition(left)) {
    assert(right.$type === 'TypeDefinition');
    return equalTypes(left.expression, right.expression);
  } else {
    assertUnreachable(left);
  }
}

function zip(left: PropertyMember[], right: PropertyMember[]): Record<string, {left?: TypeReference, right?: TypeReference}> {
  const result: Record<string, {left?: TypeReference, right?: TypeReference}> = {};
  for (const lefty of left) {
    result[lefty.name] = {left: lefty.type};
  }
  for (const righty of right) {
    result[righty.name] = {right: righty.type};
  }
  return result;
}