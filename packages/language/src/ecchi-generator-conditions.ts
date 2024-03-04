import { Types } from "./ecchi-infer-type.js";
import { isArrayType, BinaryExpression, UnaryExpression, ConceptDefinition, TypeReference, isConceptReference, isNumberType } from "./generated/ast.js";

interface OpcodeBase {
  op: string;
}
interface BooleanOperand extends OpcodeBase {
  op: 'boolean';
  value: boolean;
}
interface StringOperand extends OpcodeBase {
  op: 'string';
  value: string;
}
interface NumberOperand extends OpcodeBase {
  op: 'number';
  value: number;
}
interface NullOperand extends OpcodeBase {
  op: 'null';
}
interface BuiltInOperand extends OpcodeBase {
  op: 'built-in';
  object: 'user'|'environment'|'subject';
}
interface GetPropertyOpcode extends OpcodeBase {
  op: 'get-property';
  receiverOperandIndex: number
  property: string;
}
interface ArrayGetOpcode extends OpcodeBase {
  op: 'array-get';
  receiverOperandIndex: number
  indexOperandIndex: number
}
interface BinaryOpcode extends OpcodeBase {
  op: 'binary';
  operator: BinaryExpression['op'];
  leftOperandIndex: number
  rightOperandIndex: number
}
interface UnaryOpcode extends OpcodeBase {
  op: 'unary';
  operator: UnaryExpression['op'];
  operandIndex: number
}
interface IsTypeOpcode extends OpcodeBase {
  op: 'is';
  type: string;
  operandIndex: number
}
type OpcodeProperties<K extends Opcode['op']> = keyof Extract<Opcode, {
  op: K;
}>;

type OpcodeKeys = {
  [K in Opcode['op']]: Exclude<OpcodeProperties<K>, 'op'>[];
}
const opKeys: OpcodeKeys = {
  'boolean': ['value'],
  'string': ['value'],
  'number': ['value'],
  'null': [],
  'built-in': ['object'],
  'get-property': ['receiverOperandIndex', 'property'],
  'array-get': ['receiverOperandIndex', 'indexOperandIndex'],
  'binary': ['operator', 'leftOperandIndex', 'rightOperandIndex'],
  'unary': ['operator', 'operandIndex'],
  'is': ['type', 'operandIndex'],
};
const subjectKeys: OpcodeKeys = {
  'boolean': [],
  'string': [],
  'number': [],
  'null': [],
  'built-in': [],
  'get-property': ['receiverOperandIndex'],
  'array-get': ['receiverOperandIndex', 'indexOperandIndex'],
  'binary': ['leftOperandIndex', 'rightOperandIndex'],
  'unary': ['operandIndex'],
  'is': ['operandIndex'],
};
const binaryTypes: Record<BinaryExpression['op'], (lhs: TypeReference, rhs: TypeReference) => TypeReference> = {
  '!=': (lhs, rhs) => Types.Boolean(),
  '%': (lhs, rhs) => Types.Number(),
  '&&': (lhs, rhs) => Types.Boolean(),
  '*': (lhs, rhs) => Types.Number(),
  '+': (lhs, rhs) => lhs.$type === "StringType" ? Types.String() : Types.Number(),
  '-': (lhs, rhs) => Types.Number(),
  '/': (lhs, rhs) => Types.Number(),
  '<': (lhs, rhs) => Types.Boolean(),
  '<=': (lhs, rhs) => Types.Boolean(),
  '==': (lhs, rhs) => Types.Boolean(),
  '>': (lhs, rhs) => Types.Boolean(),
  '>=': (lhs, rhs) => Types.Boolean(),
  '||': (lhs, rhs) => Types.Boolean(),
};
const unaryTypes: Record<UnaryExpression['op'], (operand: TypeReference) => TypeReference> = {
  '!': (operand) => Types.Boolean(),
  '-': (operand) => Types.Number(),
  '+': (operand) => Types.Number(),
};

function opcodeHashCode(opcode: Opcode): number {
  const keys = ['op', ...opKeys[opcode.op]] as OpcodeProperties<typeof opcode.op>[];  
  const code = keys.map(k => opcode[k] as string).join('_');
  return code.split('').reduce((a,b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

function opcodeEquals(a: Opcode, b: Opcode): boolean {
  const keys = ['op', ...opKeys[a.op]] as OpcodeProperties<typeof a.op>[];
  return keys.every(k => a[k] === b[k]);
}


export type Opcode =
  | BooleanOperand
  | StringOperand
  | NumberOperand
  | NullOperand
  | BuiltInOperand
  | GetPropertyOpcode
  | ArrayGetOpcode
  | BinaryOpcode
  | UnaryOpcode
  | IsTypeOpcode
  ;

export interface ExpressionBuilderFactory {
  forSubject(subject: ConceptDefinition): ExpressionBuilder;
}


export interface ExpressionBuilder {
  null(): number;
  true(): number;
  false(): number;
  boolean(value: boolean): number;
  string(value: string): number;
  number(value: number): number;
  builtIn(kind: 'user'|'environment'|'subject'): number;
  property(receiverOperandIndex: number, prop: string): number;
  arrayAt(receiverOperandIndex: number, indexOperandIndex: number): number;
  binary(operator: BinaryExpression['op'], leftOperandIndex: number, rigthOperandIndex: number): number;
  unary(operator: UnaryExpression['op'], operandIndex: number): number;
  is(operandIndex: number, type: ConceptDefinition): number;
}

export type OpcodeElement = {
  index: number;
  code: Opcode;
  type: TypeReference;
}

//Dummy element to avoid 0 index
const Dummy: OpcodeElement = { code: { op: 'null' }, index: 0, type: Types.Null() };

export class ExpressionBuilderFactoryImpl implements ExpressionBuilderFactory {
  private readonly byHashCode = new Map<number, OpcodeElement[]>();
  public readonly commonElements: OpcodeElement[] = [Dummy];
  constructor(private readonly environment: ConceptDefinition|undefined, private readonly user: ConceptDefinition){
  }
  forSubject(subject: ConceptDefinition): ExpressionBuilderImpl {
    return new ExpressionBuilderImpl(this.byHashCode, this.commonElements, this.environment, this.user, subject);
  }
}

export class ExpressionBuilderImpl implements ExpressionBuilder {
  private readonly roots: {
    user: ConceptDefinition;
    environment: ConceptDefinition|undefined;
    subject: ConceptDefinition;
  };
  readonly subjectElements: OpcodeElement[] = [Dummy];
  constructor(
    private byHashCode: Map<number, OpcodeElement[]>,
    private commonElements: OpcodeElement[],
    environment: ConceptDefinition|undefined,
    user: ConceptDefinition,
    subject: ConceptDefinition
  ){
    this.null();
    this.true();
    this.false();
    this.roots = {
      user,
      environment: environment,
      subject,
    };
  }
  null(): number {
    return this.findOrInsert({ op: 'null' }, Types.Null());
  }
  true(): number {
    return this.findOrInsert({ op: 'boolean', value: true }, Types.Boolean());
  }
  false(): number {
    return this.findOrInsert({ op: 'boolean', value: false }, Types.Boolean());
  }
  boolean(value: boolean): number {
    return this.findOrInsert({ op: 'boolean', value }, Types.Boolean());
  }
  string(value: string): number {
    return this.findOrInsert({ op: 'string', value }, Types.String());
  }
  number(value: number): number {
    return this.findOrInsert({ op: 'number', value }, Types.Number());
  }
  builtIn(kind: "user" | "environment" | "subject"): number {
    const definition = this.roots[kind];
    if(!definition) { throw new Error(`Root ${kind} not defined`); }
    return this.findOrInsert({ op: 'built-in', object: kind }, Types.Object(definition));
  }
  property(receiverOperandIndex: number, prop: string): number {
    const receiver = this.getElement(receiverOperandIndex).type;
    if(!isConceptReference(receiver) || !receiver.type.ref) {
      throw new Error('Receiver is not a concept reference!');
    }
    const property = receiver.type.ref.members.find(p => p.name === prop);
    if(!property) {
      throw new Error(`Property '${prop}' not found in concept '${receiver.$type}'.`);
    }
    return this.findOrInsert({ op: 'get-property', receiverOperandIndex, property: prop }, property.type);
  }
  arrayAt(receiverOperandIndex: number, indexOperandIndex: number): number {
    const receiver = this.getElement(receiverOperandIndex).type;
    if(!isArrayType(receiver)) {
      throw new Error('Receiver is not a array type!');
    }
    const index = this.getElement(indexOperandIndex).type;
    if(!isNumberType(index)) {
      throw new Error('Index is not a number type!');
    }
    return this.findOrInsert({
      op: 'array-get',
      receiverOperandIndex,
      indexOperandIndex
    }, receiver.type);
  }
  binary(operator: BinaryExpression['op'], leftOperandIndex: number, rightOperandIndex: number): number {
    const lhs = this.getElement(leftOperandIndex).type;
    const rhs = this.getElement(rightOperandIndex).type;
    return this.findOrInsert({ op: 'binary', operator, leftOperandIndex, rightOperandIndex: rightOperandIndex }, binaryTypes[operator](lhs, rhs));
  }
  unary(operator: "+" | "-" | "!", operandIndex: number): number {
    const operand = this.getElement(operandIndex).type;
    return this.findOrInsert({ op: 'unary', operator, operandIndex }, unaryTypes[operator](operand));
  }
  is(operandIndex: number, type: ConceptDefinition): number {
    return this.findOrInsert({ op: 'is', type: type.name, operandIndex }, Types.Boolean());
  }
  private getElement(index: number): OpcodeElement {
    if(index < 0) {
      return this.subjectElements[-index];
    } else {
      return this.commonElements[index];
    }
  }
  private isSubjectDependent(opcode: Opcode): boolean {
    const keys = subjectKeys[opcode.op] as OpcodeProperties<typeof opcode.op>[];
    return (opcode.op === "built-in" && opcode.object === "subject") 
      || keys.some(k => opcode[k] as unknown as number < 0);
  }
  private findOrInsert(opcode: Opcode, type: TypeReference): number {
    const code = opcodeHashCode(opcode);
    let list = this.byHashCode.get(code);
    if (!list) {
      list = [];
      this.byHashCode.set(code, list);
    }
    for (const element of list) {
      if (opcodeEquals(element.code, opcode)) {
        return element.index;
      }
    }
    const isSubject = this.isSubjectDependent(opcode);
    const elements = isSubject ? this.subjectElements : this.commonElements;
    const index = isSubject ? -elements.length : elements.length;
    const element = { index, code: opcode, type };
    list.push(element);
    elements.push(element);
    return index;
  }
}