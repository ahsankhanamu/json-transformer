/**
 * Base Code Generator - Shared functionality for all code generators
 */

import * as AST from '../ast.js';

export interface CodeGenOptions {
  /** Pretty print the output */
  pretty?: boolean;
  /** Variable name for input data */
  inputVar?: string;
  /** Variable name for bindings/context */
  bindingsVar?: string;
  /** Variable name for parent context */
  parentVar?: string;
  /** Wrap in function */
  wrapInFunction?: boolean;
  /** Function name (if wrapping) */
  functionName?: string;
}

export const DEFAULT_OPTIONS: Required<CodeGenOptions> = {
  pretty: true,
  inputVar: 'input',
  bindingsVar: 'bindings',
  parentVar: 'parent',
  wrapInFunction: true,
  functionName: 'transform',
};

export abstract class BaseCodeGenerator {
  protected options: Required<CodeGenOptions>;
  protected localVariables: Set<string> = new Set();
  protected currentPath: string[] = [];
  protected pipeContextVar: string | null = null;
  protected tempVarCounter: number = 0;

  constructor(options: CodeGenOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  generate(program: AST.Program): string {
    const body = this.generateProgram(program);

    if (this.options.wrapInFunction) {
      const params = [this.options.inputVar];
      if (this.options.bindingsVar) {
        params.push(`${this.options.bindingsVar} = {}`);
      }

      return `function ${this.options.functionName}(${params.join(', ')}) {\n${this.indentCode(body, 1)}\n}`;
    }

    return body;
  }

  // ============================================================================
  // PROGRAM GENERATION
  // ============================================================================

  protected generateProgram(program: AST.Program): string {
    const parts: string[] = [];

    for (const stmt of program.statements) {
      parts.push(this.generateLetBinding(stmt));
    }

    if (program.expression) {
      if (program.expression.type === 'PipeExpression') {
        const pipeStatements = this.generateFlattenedPipeChain(program.expression);
        parts.push(...pipeStatements);
      } else {
        const expr = this.generateExpression(program.expression);
        parts.push(`return ${expr};`);
      }
    }

    return parts.join('\n');
  }

  protected generateLetBinding(node: AST.LetBinding): string {
    const keyword = node.constant ? 'const' : 'let';
    const value = this.generateExpression(node.value);
    this.localVariables.add(node.name);
    return `${keyword} ${node.name} = ${value};`;
  }

  // ============================================================================
  // PIPE CHAIN FLATTENING
  // ============================================================================

  protected generateFlattenedPipeChain(node: AST.PipeExpression): string[] {
    const steps: AST.Expression[] = [];
    let current: AST.Expression = node;

    while (current.type === 'PipeExpression') {
      steps.unshift(current.right);
      current = current.left;
    }
    const initial = current;

    const needsPipeVar = steps.some(
      (step) =>
        step.type === 'ObjectLiteral' ||
        step.type === 'ArrayLiteral' ||
        this.containsPipeContextRef(step)
    );

    if (steps.length === 1 && !needsPipeVar) {
      const expr = this.generateExpression(node);
      return [`return ${expr};`];
    }

    const statements: string[] = [];
    const pipeVar = '_pipe';

    statements.push(`let ${pipeVar} = ${this.generateExpression(initial)};`);

    for (let i = 0; i < steps.length - 1; i++) {
      const step = steps[i];
      const transformed = this.generatePipeStep(step, pipeVar);
      statements.push(`${pipeVar} = ${transformed};`);
    }

    const lastStep = steps[steps.length - 1];
    const finalExpr = this.generatePipeStep(lastStep, pipeVar);
    statements.push(`return ${finalExpr};`);

    return statements;
  }

  protected generatePipeStep(step: AST.Expression, pipeVar: string): string {
    if (step.type === 'ObjectLiteral' || step.type === 'ArrayLiteral') {
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = pipeVar;
      const result = this.generateExpression(step);
      this.pipeContextVar = prevPipeVar;
      return result;
    }

    if (this.containsPipeContextRef(step)) {
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = pipeVar;
      const result = this.generateExpression(step);
      this.pipeContextVar = prevPipeVar;
      return result;
    }

    const pipedResult = this.tryGeneratePipedCall(step, pipeVar);
    if (pipedResult) {
      return pipedResult;
    }

    const stepCode = this.generateExpression(step);
    return `${stepCode}(${pipeVar})`;
  }

  // ============================================================================
  // EXPRESSION GENERATION - Main dispatcher
  // ============================================================================

  protected generateExpression(node: AST.Expression): string {
    switch (node.type) {
      case 'NumberLiteral':
        return String(node.value);
      case 'StringLiteral':
        return JSON.stringify(node.value);
      case 'BooleanLiteral':
        return String(node.value);
      case 'NullLiteral':
        return 'null';
      case 'UndefinedLiteral':
        return 'undefined';
      case 'TemplateLiteral':
        return this.generateTemplateLiteral(node);
      case 'ObjectLiteral':
        return this.generateObjectLiteral(node);
      case 'ArrayLiteral':
        return this.generateArrayLiteral(node);
      case 'Identifier':
        return this.generateIdentifier(node);
      case 'MemberAccess':
        return this.generateMemberAccess(node);
      case 'IndexAccess':
        return this.generateIndexAccess(node);
      case 'SliceAccess':
        return this.generateSliceAccess(node);
      case 'SpreadAccess':
        return this.generateSpreadAccess(node);
      case 'FilterAccess':
        return this.generateFilterAccess(node);
      case 'MapTransform':
        return this.generateMapTransform(node);
      case 'RootAccess':
        return this.generateRootAccess(node);
      case 'ParentAccess':
        return this.generateParentAccess(node);
      case 'CurrentAccess':
        return this.generateCurrentAccess(node);
      case 'BindingAccess':
        return this.generateBindingAccess(node);
      case 'BinaryExpression':
        return this.generateBinaryExpression(node);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node);
      case 'TernaryExpression':
        return this.generateTernaryExpression(node);
      case 'PipeExpression':
        return this.generatePipeExpression(node);
      case 'PipeContextRef':
        return this.pipeContextVar || this.options.inputVar;
      case 'NullCoalesce':
        return this.generateNullCoalesce(node);
      case 'CallExpression':
        return this.generateCallExpression(node);
      case 'ArrowFunction':
        return this.generateArrowFunction(node);
      case 'IfExpression':
        return this.generateIfExpression(node);
      case 'TypeAssertion':
        return this.generateTypeAssertion(node);
      case 'NonNullAssertion':
        return this.generateNonNullAssertion(node);
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  // ============================================================================
  // LITERAL GENERATION (shared)
  // ============================================================================

  protected generateTemplateLiteral(node: AST.TemplateLiteral): string {
    const parts = node.parts.map((part) => {
      if (typeof part === 'string') {
        return part.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      }
      return `\${${this.generateExpression(part)}}`;
    });
    return '`' + parts.join('') + '`';
  }

  protected generateObjectLiteral(node: AST.ObjectLiteral): string {
    if (node.properties.length === 0) return '{}';

    const hasInlineLets = node.properties.some((p) => p.type === 'InlineLetProperty');

    if (hasInlineLets) {
      return this.generateObjectLiteralWithInlineLets(node);
    }

    const props = node.properties.map((prop) => this.generateObjectProperty(prop));

    if (this.options.pretty && props.length > 2) {
      return `{\n${this.indentCode(props.join(',\n'), 1)}\n}`;
    }
    return `{ ${props.join(', ')} }`;
  }

  protected generateObjectProperty(prop: AST.ObjectProperty): string {
    switch (prop.type) {
      case 'StandardProperty': {
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key)
          ? prop.key
          : JSON.stringify(prop.key);
        return `${key}: ${this.generateExpression(prop.value)}`;
      }
      case 'ShorthandProperty':
        return prop.key;
      case 'ComputedProperty':
        return `[${this.generateExpression(prop.key)}]: ${this.generateExpression(prop.value)}`;
      case 'SpreadProperty':
        return `...${this.generateExpression(prop.argument)}`;
      case 'InlineLetProperty':
        // Should not be called directly; handled in generateObjectLiteralWithInlineLets
        return `${prop.key}: ${prop.name}`;
    }
  }

  protected generateObjectLiteralWithInlineLets(node: AST.ObjectLiteral): string {
    const savedLocals = new Set(this.localVariables);
    const lines: string[] = [];

    // Emit const declarations for inline lets, then build the object
    for (const prop of node.properties) {
      if (prop.type === 'InlineLetProperty') {
        const value = this.generateExpression(prop.value);
        lines.push(`const ${prop.name} = ${value};`);
        this.localVariables.add(prop.name);
      }
    }

    // Now generate the object literal with inline lets resolved as bare names
    const props = node.properties.map((prop) => {
      if (prop.type === 'InlineLetProperty') {
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key)
          ? prop.key
          : JSON.stringify(prop.key);
        return `${key}: ${prop.name}`;
      }
      return this.generateObjectProperty(prop);
    });

    let objStr: string;
    if (this.options.pretty && props.length > 2) {
      objStr = `{\n${this.indentCode(props.join(',\n'), 1)}\n}`;
    } else {
      objStr = `{ ${props.join(', ')} }`;
    }

    lines.push(`return ${objStr};`);

    this.localVariables = savedLocals;

    return `(() => {\n${this.indentCode(lines.join('\n'), 1)}\n})()`;
  }

  protected generateArrayLiteral(node: AST.ArrayLiteral): string {
    if (node.elements.length === 0) return '[]';

    const elements = node.elements.map((el) => {
      if (el.type === 'SpreadElement') {
        return `...${this.generateExpression(el.argument)}`;
      }
      return this.generateExpression(el);
    });

    return `[${elements.join(', ')}]`;
  }

  // ============================================================================
  // BINARY/UNARY/TERNARY (shared)
  // ============================================================================

  protected generateBinaryExpression(node: AST.BinaryExpression): string {
    const op = node.operator;

    if (op === '&') {
      return this.generateConcatenation(node);
    }

    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);

    if (op === 'in') {
      return `(${right}).includes(${left})`;
    }

    return `(${left} ${op} ${right})`;
  }

  protected generateConcatenation(node: AST.BinaryExpression): string {
    const parts = this.flattenConcatenation(node);

    let template = '`';
    for (const part of parts) {
      if (part.type === 'StringLiteral') {
        const escaped = (part.value as string)
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\$\{/g, '\\${');
        template += escaped;
      } else {
        const generated = this.generateExpression(part);
        const wrapped = this.canBeNullish(part) ? `${generated} ?? ''` : generated;
        template += '${' + wrapped + '}';
      }
    }
    template += '`';

    return template;
  }

  protected flattenConcatenation(node: AST.Expression): AST.Expression[] {
    if (node.type === 'BinaryExpression' && node.operator === '&') {
      return [...this.flattenConcatenation(node.left), ...this.flattenConcatenation(node.right)];
    }
    return [node];
  }

  protected canBeNullish(node: AST.Expression): boolean {
    switch (node.type) {
      case 'StringLiteral':
      case 'NumberLiteral':
      case 'BooleanLiteral':
      case 'TemplateLiteral':
      case 'ArrayLiteral':
      case 'ObjectLiteral':
        return false;
      case 'BinaryExpression':
        if (node.operator === '&' || ['+', '-', '*', '/', '%'].includes(node.operator)) {
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  protected generateUnaryExpression(node: AST.UnaryExpression): string {
    const argument = this.generateExpression(node.argument);
    let op = node.operator;
    if (op === 'not') op = '!';
    return `${op}${argument}`;
  }

  protected generateTernaryExpression(node: AST.TernaryExpression): string {
    const test = this.generateExpression(node.test);
    const consequent = this.generateExpression(node.consequent);
    const alternate = this.generateExpression(node.alternate);
    return `(${test} ? ${consequent} : ${alternate})`;
  }

  protected generateNullCoalesce(node: AST.NullCoalesce): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);
    return `(${left} ?? ${right})`;
  }

  // ============================================================================
  // ARROW FUNCTION (shared)
  // ============================================================================

  protected generateArrowFunction(node: AST.ArrowFunction): string {
    const params = node.params
      .map((p) => {
        if (p.destructure) {
          return this.generateObjectLiteral(p.destructure);
        }
        if (p.arrayDestructure) {
          const names = p.arrayDestructure.elements.map((el) => {
            if (el.type === 'Identifier') return el.name;
            if (el.type === 'SpreadElement' && el.argument.type === 'Identifier')
              return `...${el.argument.name}`;
            return '_';
          });
          return `[${names.join(', ')}]`;
        }
        return p.name;
      })
      .join(', ');
    const savedLocals = new Set(this.localVariables);

    for (const param of node.params) {
      if (param.destructure) {
        for (const prop of param.destructure.properties) {
          if (prop.type === 'ShorthandProperty') {
            this.localVariables.add(prop.key);
          } else if (prop.type === 'StandardProperty' && prop.value.type === 'Identifier') {
            this.localVariables.add(prop.value.name);
          }
        }
      } else if (param.arrayDestructure) {
        for (const el of param.arrayDestructure.elements) {
          if (el.type === 'Identifier') {
            this.localVariables.add(el.name);
          }
        }
      } else {
        this.localVariables.add(param.name);
      }
    }

    const body = this.generateExpression(node.body);
    this.localVariables = savedLocals;

    if (node.body.type === 'ObjectLiteral') {
      return `(${params}) => (${body})`;
    }
    return `(${params}) => ${body}`;
  }

  // ============================================================================
  // IF EXPRESSION (shared)
  // ============================================================================

  protected generateIfExpression(node: AST.IfExpression): string {
    let result = '';

    for (let i = 0; i < node.conditions.length; i++) {
      const cond = node.conditions[i];
      const test = this.generateExpression(cond.test);
      const consequent = this.generateExpression(cond.consequent);

      if (i === 0) {
        result = `(${test} ? ${consequent}`;
      } else {
        result += ` : ${test} ? ${consequent}`;
      }
    }

    const alternate = node.alternate ? this.generateExpression(node.alternate) : 'undefined';
    result += ` : ${alternate}`;
    result += ')'.repeat(node.conditions.length);

    return result;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  protected indentCode(code: string, levels: number = 1): string {
    const indent = '  '.repeat(levels);
    return code
      .split('\n')
      .map((line) => indent + line)
      .join('\n');
  }

  protected getTempVar(prefix: string = '_temp'): string {
    return `${prefix}${this.tempVarCounter++}`;
  }

  protected buildPathFromNode(node: AST.Expression): string {
    switch (node.type) {
      case 'Identifier':
        return node.name;
      case 'MemberAccess':
        return `${this.buildPathFromNode(node.object)}.${node.property}`;
      case 'IndexAccess':
        const idx = node.index.type === 'NumberLiteral' ? node.index.value : '*';
        return `${this.buildPathFromNode(node.object)}[${idx}]`;
      case 'SpreadAccess':
        return `${this.buildPathFromNode(node.object)}[*]`;
      case 'RootAccess':
        return node.path ?? '$';
      case 'CurrentAccess':
        return node.path ?? '.';
      default:
        return '';
    }
  }

  /** Known array methods that return arrays */
  protected static ARRAY_RETURNING_METHODS = new Set([
    'map',
    'filter',
    'slice',
    'sort',
    'flatMap',
    'concat',
    'reverse',
    'flat',
    'toSorted',
    'toReversed',
    'toSpliced',
  ]);

  /**
   * Check if an expression produces an array that should auto-project on property access.
   * Returns true for: SpreadAccess, FilterAccess, SliceAccess, array-returning CallExpressions,
   * and MemberAccess chains that end in any of these.
   */
  protected isArrayProducingExpression(node: AST.Expression): boolean {
    switch (node.type) {
      case 'SpreadAccess':
      case 'FilterAccess':
      case 'SliceAccess':
        return true;
      case 'CallExpression':
        return this.isArrayReturningCall(node);
      case 'MemberAccess':
        return this.isArrayProducingExpression(node.object);
      default:
        return false;
    }
  }

  /** Check if a CallExpression is a call to a known array-returning method */
  protected isArrayReturningCall(node: AST.CallExpression): boolean {
    if (node.callee.type === 'MemberAccess') {
      return BaseCodeGenerator.ARRAY_RETURNING_METHODS.has(node.callee.property);
    }
    return false;
  }

  /**
   * Check if property access after an array-producing expression should auto-project.
   * Skips auto-projection when the property is itself an array method (method chaining).
   */
  protected shouldAutoProject(node: AST.MemberAccess): boolean {
    // Skip if property is an array method name (method chaining like .filter().map())
    if (BaseCodeGenerator.ARRAY_RETURNING_METHODS.has(node.property)) {
      return false;
    }
    return this.isArrayProducingExpression(node.object);
  }

  protected containsPipeContextRef(node: AST.Expression): boolean {
    if (node.type === 'PipeContextRef') return true;
    if (node.type === 'MemberAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'IndexAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'SpreadAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'MapTransform') return this.containsPipeContextRef((node as any).array);
    if (node.type === 'CallExpression') {
      return (
        this.containsPipeContextRef(node.callee) ||
        node.arguments.some((a) => this.containsPipeContextRef(a))
      );
    }
    if (node.type === 'ObjectLiteral') {
      return node.properties.some((prop) => {
        if (
          prop.type === 'StandardProperty' ||
          prop.type === 'ComputedProperty' ||
          prop.type === 'InlineLetProperty'
        ) {
          return this.containsPipeContextRef(prop.value);
        }
        if (prop.type === 'SpreadProperty') {
          return this.containsPipeContextRef(prop.argument);
        }
        return false;
      });
    }
    if (node.type === 'ArrayLiteral') {
      return node.elements.some((el) => {
        if (el.type === 'SpreadElement') {
          return this.containsPipeContextRef(el.argument);
        }
        return this.containsPipeContextRef(el);
      });
    }
    if (node.type === 'BinaryExpression') {
      return this.containsPipeContextRef(node.left) || this.containsPipeContextRef(node.right);
    }
    if (node.type === 'TernaryExpression') {
      return (
        this.containsPipeContextRef(node.test) ||
        this.containsPipeContextRef(node.consequent) ||
        this.containsPipeContextRef(node.alternate)
      );
    }
    if (node.type === 'PipeExpression') {
      return this.containsPipeContextRef(node.left) || this.containsPipeContextRef(node.right);
    }
    return false;
  }

  protected tryExtractPropertyPath(node: AST.Expression): string | null {
    if (node.type === 'CurrentAccess') {
      return node.path ?? null;
    }
    if (node.type === 'PipeContextRef') {
      return '';
    }
    if (node.type === 'MemberAccess' && !node.optional) {
      if (node.object.type === 'PipeContextRef') {
        return node.property;
      }
      if (node.object.type === 'CurrentAccess' && node.object.path) {
        return `${node.object.path}.${node.property}`;
      }
      const objectPath = this.tryExtractPropertyPath(node.object);
      if (objectPath !== null) {
        return objectPath === '' ? node.property : `${objectPath}.${node.property}`;
      }
    }
    if (node.type === 'Identifier') {
      if (this.localVariables.has(node.name)) {
        return null;
      }
      return node.name;
    }
    return null;
  }

  // ============================================================================
  // PIPE EXPRESSION (shared)
  // ============================================================================

  protected generatePipeExpression(node: AST.PipeExpression): string {
    const left = this.generateExpression(node.left);

    // Object literal on right
    if (node.right.type === 'ObjectLiteral') {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      return `(((${tempVar}) => (${right}))(${left}))`;
    }

    // Array literal on right
    if (node.right.type === 'ArrayLiteral') {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      return `(((${tempVar}) => ${right})(${left}))`;
    }

    // PipeContextRef
    if (this.containsPipeContextRef(node.right)) {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      return `(((${tempVar}) => ${right})(${left}))`;
    }

    // Try piped call
    const pipedResult = this.tryGeneratePipedCall(node.right, left);
    if (pipedResult) {
      return pipedResult;
    }

    // Fallback
    const right = this.generateExpression(node.right);
    return `${right}(${left})`;
  }

  // ============================================================================
  // PREDICATE / MAP TEMPLATE HELPERS (shared)
  // ============================================================================

  protected generatePredicateFunction(predicate: AST.Expression): string {
    const childGen = this.createChildGenerator('item');
    const body = childGen.generateExpressionPublic(predicate);
    return `(item, index, arr) => ${body}`;
  }

  public generateExpressionPublic(node: AST.Expression): string {
    return this.generateExpression(node);
  }

  protected generateObjectLiteralForMap(node: AST.ObjectLiteral): string {
    if (node.properties.length === 0) return '{}';

    const props = node.properties.map((prop) => {
      switch (prop.type) {
        case 'StandardProperty':
          const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key)
            ? prop.key
            : JSON.stringify(prop.key);
          return `${key}: ${this.generateExpression(prop.value)}`;
        case 'ShorthandProperty':
          return `${prop.key}: item?.${prop.key}`;
        case 'ComputedProperty':
          return `[${this.generateExpression(prop.key)}]: ${this.generateExpression(prop.value)}`;
        case 'SpreadProperty':
          return `...${this.generateExpression(prop.argument)}`;
      }
    });

    return `{ ${props.join(', ')} }`;
  }

  // ============================================================================
  // IDENTIFIER (concrete, uses hook)
  // ============================================================================

  protected generateIdentifier(node: AST.Identifier): string {
    if (this.localVariables.has(node.name)) {
      return node.name;
    }

    switch (node.name) {
      case '$item':
        return 'item';
      case '$index':
      case '$i':
        return 'index';
      case '$array':
        return 'arr';
      case '$length':
        return 'arr.length';
      case '$first':
        return '(index === 0)';
      case '$last':
        return '(index === arr.length - 1)';
    }

    return this.identifierFallback(this.options.inputVar, node.name);
  }

  // ============================================================================
  // CONTEXT ACCESS (concrete, uses hook)
  // ============================================================================

  protected generateRootAccess(node: AST.RootAccess): string {
    const input = this.options.inputVar;
    if (node.path === null) return input;
    return `${input}${this.contextAccessOp()}${node.path}`;
  }

  protected generateParentAccess(node: AST.ParentAccess): string {
    const parent = this.options.parentVar;
    if (node.path === null) return parent;
    return `${parent}${this.contextAccessOp()}${node.path}`;
  }

  protected generateCurrentAccess(node: AST.CurrentAccess): string {
    const input = this.options.inputVar;
    if (node.path === null) return input;
    return `${input}${this.contextAccessOp()}${node.path}`;
  }

  protected generateBindingAccess(node: AST.BindingAccess): string {
    return `${this.options.bindingsVar}${this.contextAccessOp()}${node.name}`;
  }

  // ============================================================================
  // INDEX ACCESS (concrete, uses hook)
  // ============================================================================

  protected generateIndexAccess(node: AST.IndexAccess): string {
    const object = this.generateExpression(node.object);
    const index = this.generateExpression(node.index);
    const path = this.buildPathFromNode(node.object);
    return this.safeIndex(object, index, path, node.optional);
  }

  // ============================================================================
  // SLICE ACCESS (concrete, uses hook)
  // ============================================================================

  protected generateSliceAccess(node: AST.SliceAccess): string {
    const object = this.generateExpression(node.object);
    const start = node.sliceStart ? this.generateExpression(node.sliceStart) : '0';
    const end = node.sliceEnd ? this.generateExpression(node.sliceEnd) : '';
    const path = this.buildPathFromNode(node.object);
    return `${this.ensureArray(object, path)}.slice(${start}${end ? ', ' + end : ''})`;
  }

  // ============================================================================
  // SPREAD ACCESS (concrete, uses hook)
  // ============================================================================

  protected generateSpreadAccess(node: AST.SpreadAccess): string {
    const object = this.generateExpression(node.object);
    const path = this.buildPathFromNode(node.object);
    return this.ensureArray(object, path);
  }

  // ============================================================================
  // FILTER ACCESS (concrete, uses hook)
  // ============================================================================

  protected generateFilterAccess(node: AST.FilterAccess): string {
    const object = this.generateExpression(node.object);
    const predicateCode = this.generatePredicateFunction(node.predicate);
    const path = this.buildPathFromNode(node.object);
    return this.filterArray(object, predicateCode, path);
  }

  // ============================================================================
  // MAP TRANSFORM (concrete, uses hook)
  // ============================================================================

  protected generateMapTransform(node: AST.MapTransform): string {
    const array = this.generateExpression(node.array);
    const path = this.buildPathFromNode(node.array);
    const childGen = this.createChildGenerator('item');
    const templateCode = childGen.generateObjectLiteralForMap(node.template);
    return this.mapArray(array, `(item, index, arr) => (${templateCode})`, path);
  }

  // ============================================================================
  // ABSTRACT HOOKS - Strategy-specific behavior (1-3 lines each in subclasses)
  // ============================================================================

  /** Operator for context access: '.' in strict library mode, '?.' otherwise */
  protected abstract contextAccessOp(): string;
  /** Fallback for unresolved identifiers: strictGet in strict, input?.name otherwise */
  protected abstract identifierFallback(input: string, name: string): string;
  /** Ensure value is array: strictArray in strict, (obj ?? []) otherwise */
  protected abstract ensureArray(obj: string, path: string): string;
  /** Filter array: strictFilter in strict, (arr ?? []).filter(pred) otherwise */
  protected abstract filterArray(arr: string, pred: string, path: string): string;
  /** Map array: strictMap in strict, (arr ?? []).map(cb) otherwise */
  protected abstract mapArray(arr: string, cb: string, path: string): string;
  /** Safe index access: strictIndex in strict, obj?.[idx] otherwise */
  protected abstract safeIndex(obj: string, idx: string, path: string, optional: boolean): string;
  /** Safe member access: strictGet in strict, obj?.prop otherwise */
  protected abstract safeMemberAccess(
    obj: string,
    prop: string,
    path: string,
    optional: boolean
  ): string;
  /** Auto-projection mapping: strictGet in strict, item?.prop otherwise */
  protected abstract autoProjectionMapping(item: string, prop: string, path: string): string;
  /** Access operator for piped chaining: '.' in strict, '?.' otherwise */
  protected abstract pipedAccessOp(optional: boolean): string;
  /** Generate piped identifier: __helpers.name(pipe) or native call */
  protected abstract pipedIdentifier(name: string, pipe: string): string;
  /** Generate piped call with args: __helpers.name(pipe, args) or native call. May return null. */
  protected abstract pipedCall(name: string, pipe: string, node: AST.CallExpression): string | null;

  // ============================================================================
  // MEMBER ACCESS (concrete, uses hooks)
  // ============================================================================

  protected generateMemberAccess(node: AST.MemberAccess): string {
    if (this.shouldAutoProject(node)) {
      return this.generateAutoProjection(node);
    }

    const object = this.generateExpression(node.object);
    const path = this.buildPathFromNode(node.object);
    return this.safeMemberAccess(object, node.property, path, node.optional);
  }

  private generateAutoProjection(node: AST.MemberAccess): string {
    const obj = node.object;
    const prop = node.property;

    if (obj.type === 'SpreadAccess') {
      const array = this.generateExpression(obj.object);
      const path = this.buildPathFromNode(obj.object);
      const mapping = this.autoProjectionMapping('item', prop, `${path}[*]`);
      return this.mapArray(array, `(item, index, arr) => ${mapping}`, path);
    }

    // Other array-producing expressions (FilterAccess, SliceAccess, etc.)
    const arrayExpr = this.generateExpression(obj);
    const path = this.getAutoProjectionPath(obj);
    const mapping = this.autoProjectionMapping('item', prop, path);
    return `(${arrayExpr}).map((item, index, arr) => ${mapping})`;
  }

  private getAutoProjectionPath(node: AST.Expression): string {
    switch (node.type) {
      case 'FilterAccess':
        return `${this.buildPathFromNode(node.object)}[?]`;
      case 'SliceAccess':
        return `${this.buildPathFromNode(node.object)}[:]`;
      default:
        return '';
    }
  }

  // ============================================================================
  // PIPED CALL (concrete, uses hooks for leaf cases)
  // ============================================================================

  protected tryGeneratePipedCall(node: AST.Expression, pipeValue: string): string | null {
    // Direct identifier: value | funcName
    if (node.type === 'Identifier') {
      return this.pipedIdentifier(node.name, pipeValue);
    }

    // Direct call: value | funcName(args)
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      return this.pipedCall(node.callee.name, pipeValue, node);
    }

    // Index access wrapping a pipeable call
    if (node.type === 'IndexAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const index = this.generateExpression(node.index);
        const op = this.pipedAccessOp(node.optional);
        const indexOp = op === '.' ? '' : op;
        return `${innerResult}${indexOp}[${index}]`;
      }
    }

    // Slice access wrapping a pipeable call
    if (node.type === 'SliceAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const start = node.sliceStart ? this.generateExpression(node.sliceStart) : '0';
        const end = node.sliceEnd ? this.generateExpression(node.sliceEnd) : '';
        return `(${innerResult}).slice(${start}${end ? ', ' + end : ''})`;
      }
    }

    // Method call on a pipeable expression: value | keys().map(x => x)
    if (node.type === 'CallExpression' && node.callee.type === 'MemberAccess') {
      const innerResult = this.tryGeneratePipedCall(node.callee.object, pipeValue);
      if (innerResult) {
        const method = node.callee.property;
        const args = node.arguments.map((a) => this.generateExpression(a));
        const op = this.pipedAccessOp(node.callee.optional);
        return `${innerResult}${op}${method}(${args.join(', ')})`;
      }
    }

    // Property access on a pipeable expression: value | keys().length
    if (node.type === 'MemberAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const op = this.pipedAccessOp(node.optional);
        return `${innerResult}${op}${node.property}`;
      }
    }

    // Spread access wrapping a pipeable call: value | entries()[*]
    if (node.type === 'SpreadAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        return innerResult;
      }
    }

    // MapTransform wrapping a pipeable call: value | entries()[*].{ key: .[0], items: .[1] }
    if (node.type === 'MapTransform') {
      const innerResult = this.tryGeneratePipedCall((node as any).array, pipeValue);
      if (innerResult) {
        const childGen = this.createChildGenerator('item');
        const templateCode = childGen.generateObjectLiteralForMap(node.template);
        return this.mapArray(innerResult, `(item, index, arr) => (${templateCode})`, 'pipe');
      }
    }

    return null;
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================================================

  protected abstract generateCallExpression(node: AST.CallExpression): string;
  protected abstract generateTypeAssertion(node: AST.TypeAssertion): string;
  protected abstract generateNonNullAssertion(node: AST.NonNullAssertion): string;

  // Factory method for creating child generators (for predicates, map templates)
  protected abstract createChildGenerator(inputVar: string): BaseCodeGenerator;
}
