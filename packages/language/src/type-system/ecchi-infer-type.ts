import { AstNode, assertUnreachable, getContainerOfType } from "langium";
import { ArrayMemberAccess, BinaryExpression, Expression, InterfaceDefinition, PropertyMemberAccess, RootMember, TypeReference, UnaryExpression, isArrayType, isForMember, isInterfaceDefinition, isModel, isTypeDefinition } from "../generated/ast.js";

export class TypeInferenceError<N extends AstNode> extends Error {
  constructor(message: string, public expression: N, public property: Exclude<keyof N, `$${string}`>) {
    super(message);
  }
}

export const Types = {
  Boolean: (): TypeReference => ({ $type: 'BooleanType', $container: undefined! }),
  Null: (): TypeReference => ({ $type: 'NullType', $container: undefined! }),
  Number: (): TypeReference => ({ $type: 'NumberType', $container: undefined! }),
  String: (): TypeReference => ({ $type: 'StringType', $container: undefined! }),
  Object: (definition: InterfaceDefinition): TypeReference => ({
    $type: 'ObjectType',
    members: definition.members,
    $container: undefined! 
  }),
};

export function inferType(expression: Expression): TypeReference {
  switch (expression.$type) {
    case "ArrayMemberAccess": return inferArrayMemberAccess(expression);
    case "BooleanLiteral": return Types.Boolean();
    case "NullLiteral": return Types.Null();
    case "NumberLiteral": return Types.Number();
    case "Parentheses": return inferType(expression.expr);
    case "PropertyMemberAccess": return inferPropertyMemberAccess(expression);
    case "RootMember": return inferRootMember(expression);
    case "StringLiteral": return Types.String();
    case "UnaryExpression": return inferUnaryExpression(expression);
    case "BinaryExpression": return inferBinaryExpression(expression);
    default:
      assertUnreachable(expression);
  }
}

function inferPropertyMemberAccess(expression: PropertyMemberAccess) {
  const memberType = expression.member.ref?.type;
  if(!memberType) {
    throw new TypeInferenceError('Unknown member type.', expression, 'member');
  }
  switch(memberType.$type) {
    case 'TypeDefinitionReference':
      const ref = memberType.type.ref;
      if(!ref) {
        throw new TypeInferenceError('Unknown member type.', expression, 'member');
      } else if(isInterfaceDefinition(ref)) {
        return Types.Object(ref);
      } else if(isTypeDefinition(ref)) {
        return ref.expression;
      } else {
        assertUnreachable(ref);
      }
      break;
    default:
      return memberType;
  }
}

function inferArrayMemberAccess(expression: ArrayMemberAccess) {
  const arrayType = inferType(expression.receiver);
  if(isArrayType(arrayType)) {
    return arrayType.type;
  }
  throw new TypeInferenceError('Array access requires array as receiver.', expression, 'receiver');
}

function inferRootMember(expression: RootMember): TypeReference {
  if(expression.isSubjectRoot) {
    const forMember = getContainerOfType(expression, isForMember)!;
    const subjectType = forMember?.subject.ref?.type.ref;
    if(!subjectType) {
      throw new TypeInferenceError('Unknown subject type.', expression, 'isSubjectRoot');
    }
    return Types.Object(subjectType);
  } else {
    const model = getContainerOfType(expression, isModel)!;
    const userType = model.userDeclaration.type.ref;
    if(!userType) {
      throw new TypeInferenceError('Unknown user type.', expression, 'isSubjectRoot');
    }
    return Types.Object(userType);
  }
}
function inferUnaryExpression(expression: UnaryExpression): TypeReference {
  switch(expression.op) {
    case "!": return { $type: 'BooleanType', $container: undefined! };
    case "+":
    case "-": return { $type: 'NumberType', $container: undefined! };
    default: assertUnreachable(expression.op);
  }
}

type BinaryOpInferer = (left: TypeReference, right: TypeReference) => TypeReference;

const BinaryExpressionTypeMap: Record<BinaryExpression['op'], BinaryOpInferer> = {
  "+": function (left: TypeReference, right: TypeReference): TypeReference {
    throw new Error("Function not implemented.");
  },
  "-": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Number();
  },
  "!=": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  "%": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Number();
  },
  "&&": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  "*": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Number();
  },
  "/": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Number();
  },
  "<": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  "<=": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  "==": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  ">": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  ">=": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  "||": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  }
};

function inferBinaryExpression(expression: BinaryExpression): TypeReference {
  return BinaryExpressionTypeMap[expression.op](inferType(expression.left), inferType(expression.right));
}