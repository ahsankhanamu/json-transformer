/**
 * Abstract Syntax Tree Node Types
 */

export interface BaseNode {
  type: string;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
}

// ============================================================================
// LITERALS
// ============================================================================

export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
}

export interface UndefinedLiteral extends BaseNode {
  type: 'UndefinedLiteral';
}

export interface TemplateLiteral extends BaseNode {
  type: 'TemplateLiteral';
  parts: (string | Expression)[];
}

// ============================================================================
// STRUCTURES
// ============================================================================

export interface ObjectLiteral extends BaseNode {
  type: 'ObjectLiteral';
  properties: ObjectProperty[];
}

export type ObjectProperty =
  | StandardProperty
  | ShorthandProperty
  | ComputedProperty
  | SpreadProperty;

export interface StandardProperty extends BaseNode {
  type: 'StandardProperty';
  key: string;
  value: Expression;
}

export interface ShorthandProperty extends BaseNode {
  type: 'ShorthandProperty';
  key: string;
}

export interface ComputedProperty extends BaseNode {
  type: 'ComputedProperty';
  key: Expression;
  value: Expression;
}

export interface SpreadProperty extends BaseNode {
  type: 'SpreadProperty';
  argument: Expression;
}

export interface ArrayLiteral extends BaseNode {
  type: 'ArrayLiteral';
  elements: (Expression | SpreadElement)[];
}

export interface SpreadElement extends BaseNode {
  type: 'SpreadElement';
  argument: Expression;
}

// ============================================================================
// IDENTIFIERS & ACCESS
// ============================================================================

export interface Identifier extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface MemberAccess extends BaseNode {
  type: 'MemberAccess';
  object: Expression;
  property: string;
  optional: boolean;
}

export interface IndexAccess extends BaseNode {
  type: 'IndexAccess';
  object: Expression;
  index: Expression;
  optional: boolean;
}

export interface SliceAccess extends BaseNode {
  type: 'SliceAccess';
  object: Expression;
  sliceStart: Expression | null;
  sliceEnd: Expression | null;
}

export interface SpreadAccess extends BaseNode {
  type: 'SpreadAccess';
  object: Expression;
}

export interface FilterAccess extends BaseNode {
  type: 'FilterAccess';
  object: Expression;
  predicate: Expression;
}

export interface MapTransform extends BaseNode {
  type: 'MapTransform';
  array: Expression;
  template: ObjectLiteral;
}

// ============================================================================
// CONTEXT ACCESS
// ============================================================================

export interface RootAccess extends BaseNode {
  type: 'RootAccess';
  path: string | null; // null means just $
}

export interface ParentAccess extends BaseNode {
  type: 'ParentAccess';
  path: string | null; // null means just ^
}

export interface CurrentAccess extends BaseNode {
  type: 'CurrentAccess';
  path: string | null; // null means just .
}

export interface BindingAccess extends BaseNode {
  type: 'BindingAccess';
  name: string;
}

// ============================================================================
// OPERATORS
// ============================================================================

export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
  prefix: boolean;
}

export interface TernaryExpression extends BaseNode {
  type: 'TernaryExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface PipeExpression extends BaseNode {
  type: 'PipeExpression';
  left: Expression;
  right: Expression;
}

export interface PipeContextRef extends BaseNode {
  type: 'PipeContextRef';
}

export interface NullCoalesce extends BaseNode {
  type: 'NullCoalesce';
  left: Expression;
  right: Expression;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface ArrowFunction extends BaseNode {
  type: 'ArrowFunction';
  params: Parameter[];
  body: Expression;
}

export interface Parameter extends BaseNode {
  type: 'Parameter';
  name: string;
  destructure?: ObjectLiteral;
  typeAnnotation?: TypeAnnotation;
  defaultValue?: Expression;
}

// ============================================================================
// CONTROL FLOW
// ============================================================================

export interface IfExpression extends BaseNode {
  type: 'IfExpression';
  conditions: ConditionalBranch[];
  alternate: Expression | null;
}

export interface ConditionalBranch extends BaseNode {
  type: 'ConditionalBranch';
  test: Expression;
  consequent: Expression;
}

// ============================================================================
// STATEMENTS
// ============================================================================

export interface LetBinding extends BaseNode {
  type: 'LetBinding';
  name: string;
  value: Expression;
  constant: boolean;
}

export interface Program extends BaseNode {
  type: 'Program';
  statements: LetBinding[];
  expression: Expression | null;
}

// ============================================================================
// TYPE ANNOTATIONS (for strict mode)
// ============================================================================

export type TypeAnnotation = PrimitiveType | ArrayType | ObjectType | UnionType | TypeReference;

export interface PrimitiveType extends BaseNode {
  type: 'PrimitiveType';
  name: 'string' | 'number' | 'boolean' | 'null' | 'any';
  nonNull: boolean;
}

export interface ArrayType extends BaseNode {
  type: 'ArrayType';
  elementType: TypeAnnotation;
}

export interface ObjectType extends BaseNode {
  type: 'ObjectType';
  properties: ObjectTypeProperty[];
}

export interface ObjectTypeProperty extends BaseNode {
  type: 'ObjectTypeProperty';
  key: string;
  valueType: TypeAnnotation;
  optional: boolean;
}

export interface UnionType extends BaseNode {
  type: 'UnionType';
  types: TypeAnnotation[];
}

export interface TypeReference extends BaseNode {
  type: 'TypeReference';
  name: string;
}

export interface TypeAssertion extends BaseNode {
  type: 'TypeAssertion';
  expression: Expression;
  typeAnnotation: TypeAnnotation;
}

export interface NonNullAssertion extends BaseNode {
  type: 'NonNullAssertion';
  expression: Expression;
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type Literal =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | UndefinedLiteral
  | TemplateLiteral;

export type ContextAccessNode = RootAccess | ParentAccess | CurrentAccess | BindingAccess;

export type Expression =
  | Literal
  | ObjectLiteral
  | ArrayLiteral
  | Identifier
  | MemberAccess
  | IndexAccess
  | SliceAccess
  | SpreadAccess
  | FilterAccess
  | MapTransform
  | ContextAccessNode
  | BinaryExpression
  | UnaryExpression
  | TernaryExpression
  | PipeExpression
  | PipeContextRef
  | NullCoalesce
  | CallExpression
  | ArrowFunction
  | IfExpression
  | TypeAssertion
  | NonNullAssertion;

export type ASTNode = Expression | Program | LetBinding | Parameter;

// ============================================================================
// VISITOR PATTERN
// ============================================================================

export interface Visitor<T = void> {
  visitProgram?(node: Program): T;
  visitLetBinding?(node: LetBinding): T;
  visitNumberLiteral?(node: NumberLiteral): T;
  visitStringLiteral?(node: StringLiteral): T;
  visitBooleanLiteral?(node: BooleanLiteral): T;
  visitNullLiteral?(node: NullLiteral): T;
  visitUndefinedLiteral?(node: UndefinedLiteral): T;
  visitTemplateLiteral?(node: TemplateLiteral): T;
  visitObjectLiteral?(node: ObjectLiteral): T;
  visitArrayLiteral?(node: ArrayLiteral): T;
  visitIdentifier?(node: Identifier): T;
  visitMemberAccess?(node: MemberAccess): T;
  visitIndexAccess?(node: IndexAccess): T;
  visitSliceAccess?(node: SliceAccess): T;
  visitSpreadAccess?(node: SpreadAccess): T;
  visitFilterAccess?(node: FilterAccess): T;
  visitRootAccess?(node: RootAccess): T;
  visitParentAccess?(node: ParentAccess): T;
  visitCurrentAccess?(node: CurrentAccess): T;
  visitBindingAccess?(node: BindingAccess): T;
  visitBinaryExpression?(node: BinaryExpression): T;
  visitUnaryExpression?(node: UnaryExpression): T;
  visitTernaryExpression?(node: TernaryExpression): T;
  visitPipeExpression?(node: PipeExpression): T;
  visitPipeContextRef?(node: PipeContextRef): T;
  visitNullCoalesce?(node: NullCoalesce): T;
  visitCallExpression?(node: CallExpression): T;
  visitArrowFunction?(node: ArrowFunction): T;
  visitIfExpression?(node: IfExpression): T;
  visitTypeAssertion?(node: TypeAssertion): T;
  visitNonNullAssertion?(node: NonNullAssertion): T;
}

export function visit<T>(node: ASTNode, visitor: Visitor<T>): T | undefined {
  const methodName = `visit${node.type}` as keyof Visitor<T>;
  const method = visitor[methodName] as ((node: ASTNode) => T) | undefined;
  if (method) {
    return method.call(visitor, node);
  }
  return undefined;
}
