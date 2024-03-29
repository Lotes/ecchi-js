import { AstNode, assertUnreachable, getContainerOfType } from "langium";
import { BinaryExpression, ConceptDefinition, Expression, PropertyMemberAccess, RootMember, TypeReference, UnaryExpression, isForMember, isModel } from "./generated/ast.js";

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
    case "TypeOfExpression": return Types.String();
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
  if(expression.isSubject) {
    const forMember = getContainerOfType(expression, isForMember)!;
    const subjectType = forMember?.subject.ref?.type.ref;
    if(!subjectType) {
      throw new TypeInferenceError('Unknown subject type.', expression, 'isSubject');
    }
    return Types.Object(subjectType);
  } else if(expression.isUser) {
    const model = getContainerOfType(expression, isModel)!;
    const userType = model.userDeclaration.type.ref;
    if(!userType) {
      throw new TypeInferenceError('Unknown user type.', expression, 'isUser');
    }
    return Types.Object(userType);
  } else if(expression.isEnvironment) {
    const model = getContainerOfType(expression, isModel)!;
    const environmentType = model.environmentDeclaration?.type.ref;
    if(!environmentType) {
      throw new TypeInferenceError('Unknown environment type.', expression, 'isEnvironment');
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