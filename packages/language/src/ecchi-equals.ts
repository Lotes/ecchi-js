import { assertUnreachable } from "langium";
import { ConceptDefinition, TypeReference } from "./generated/ast.js";

export function equalTypes(a: TypeReference, b: TypeReference): boolean {
  if (a.$type !== b.$type) {
    return false;
  }

  switch (a.$type) {
    case 'ConceptReference':
      assert(b.$type === 'ConceptReference');
      return equalDefinitions(a.type.ref, b.type.ref);
    case 'ArrayType':
      assert(b.$type === 'ArrayType');
      return equalTypes(a.type, b.type);
    case 'BooleanType':
    case 'NullType':
    case 'NumberType':
    case 'StringType':
      return true;
    default:
      assertUnreachable(a)
  }
}

function assert(condition: boolean): asserts condition {
  if (!condition) {
    throw new Error("Unexpected falsy assertion. ");
  }
}

function equalDefinitions(left: ConceptDefinition | undefined, right: ConceptDefinition | undefined): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }
  if (left.$type !== right.$type) {
    return false;
  }
  return left.name === right.name;    
}