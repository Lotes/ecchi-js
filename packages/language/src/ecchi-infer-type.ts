import { AstNode, assertUnreachable, getContainerOfType } from "langium";
import { ArrayMemberAccess, BinaryExpression, ConceptDefinition, Expression, PropertyMemberAccess, RootMember, TypeReference, UnaryExpression, isForMember, isModel, isStringType } from "./generated/ast.js";

export class TypeInferenceError<N extends AstNode> extends Error {
  constructor(message: string, public expression: N, public property: Exclude<keyof N, `$${string}`>) {
    super(message);
  }
}

export const Types = {
  Array: (type: TypeReference): TypeReference => ({ $type: 'ArrayType', type, $container: undefined! }),
  Boolean: (): TypeReference => ({ $type: 'BooleanType', $container: undefined! }),
  Null: (): TypeReference => ({ $type: 'NullType', $container: undefined! }),
  Number: (): TypeReference => ({ $type: 'NumberType', $container: undefined! }),
  String: (): TypeReference => ({ $type: 'StringType', $container: undefined! }),
  Object: (definition: ConceptDefinition): TypeReference => ({
    $type: 'ConceptReference',
    type: {
      ref: definition,
      $refText: definition.name
    },
    $container: undefined! 
  }),
};

export function inferType(expression: Expression): TypeReference {
  switch (expression.$type) {
    case "BooleanLiteral": return Types.Boolean();
    case "NullLiteral": return Types.Null();
    case "NumberLiteral": return Types.Number();
    case "Parentheses": return inferType(expression.expr);
    case "PropertyMemberAccess": return inferPropertyMemberAccess(expression);
    case "RootMember": return inferRootMember(expression);
    case "StringLiteral": return Types.String();
    case "UnaryExpression": return inferUnaryExpression(expression);
    case "BinaryExpression": return inferBinaryExpression(expression);
    case "IsExpression": return Types.Boolean();
    case "ArrayMemberAccess": return inferArrayMemberAccess(expression);
    default:
      assertUnreachable(expression);
  }
}

function inferArrayMemberAccess(expression: ArrayMemberAccess) {
  const receiverType = inferType(expression.receiver);
  if(receiverType.$type !== 'ArrayType') {
    throw new TypeInferenceError('Receiver is not an array.', expression, 'receiver');
  }
  return receiverType.type;
}

function inferPropertyMemberAccess(expression: PropertyMemberAccess) {
  const memberType = expression.member.ref?.type;
  if(!memberType) {
    throw new TypeInferenceError('Unknown member type.', expression, 'member');
  }
  switch(memberType.$type) {
    case 'ConceptReference':
      const ref = memberType.type.ref;
      if(!ref) {
        throw new TypeInferenceError('Unknown member type.', expression, 'member');
      }
      return Types.Object(ref);
    default:
      return memberType;
  }
}

function inferRootMember(expression: RootMember): TypeReference {
  if(expression.kind === 'subject') {
    const forMember = getContainerOfType(expression, isForMember)!;
    const subjectType = forMember?.subject.ref?.type.ref;
    if(!subjectType) {
      throw new TypeInferenceError('Unknown subject type.', expression, 'kind');
    }
    return Types.Object(subjectType);
  } else if(expression.kind === 'user') {
    const model = getContainerOfType(expression, isModel)!;
    const userType = model.userDeclaration.type.ref;
    if(!userType) {
      throw new TypeInferenceError('Unknown user type.', expression, 'kind');
    }
    return Types.Object(userType);
  } else if(expression.kind === 'environment') {
    const model = getContainerOfType(expression, isModel)!;
    const environmentType = model.environmentDeclaration?.type.ref;
    if(!environmentType) {
      throw new TypeInferenceError('Unknown environment type.', expression, 'kind');
    }
    return Types.Object(environmentType);
  } else {
    return undefined!;
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
  "in": function (left: TypeReference, right: TypeReference): TypeReference {
    return Types.Boolean();
  },
  "+": function (left: TypeReference, right: TypeReference): TypeReference {
    if(isStringType(left) || isStringType(right)) {
      return Types.String();
    }
    return Types.Number();
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