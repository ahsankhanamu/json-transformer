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

    const props = node.properties.map((prop) => {
      switch (prop.type) {
        case 'StandardProperty':
          const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key)
            ? prop.key
            : JSON.stringify(prop.key);
          return `${key}: ${this.generateExpression(prop.value)}`;
        case 'ShorthandProperty':
          return prop.key;
        case 'ComputedProperty':
          return `[${this.generateExpression(prop.key)}]: ${this.generateExpression(prop.value)}`;
        case 'SpreadProperty':
          return `...${this.generateExpression(prop.argument)}`;
      }
    });

    if (this.options.pretty && props.length > 2) {
      return `{\n${this.indentCode(props.join(',\n'), 1)}\n}`;
    }
    return `{ ${props.join(', ')} }`;
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
    const params = node.params.map((p) => p.name).join(', ');
    const savedLocals = new Set(this.localVariables);

    for (const param of node.params) {
      this.localVariables.add(param.name);
    }

    const body = this.generateExpression(node.body);
    this.localVariables = savedLocals;

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

  protected isArrayProducingMemberAccess(node: AST.MemberAccess): boolean {
    if (
      node.object.type === 'SpreadAccess' ||
      node.object.type === 'FilterAccess' ||
      node.object.type === 'SliceAccess'
    ) {
      return true;
    }
    if (node.object.type === 'MemberAccess') {
      return this.isArrayProducingMemberAccess(node.object);
    }
    return false;
  }

  protected containsPipeContextRef(node: AST.Expression): boolean {
    if (node.type === 'PipeContextRef') return true;
    if (node.type === 'MemberAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'IndexAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'CallExpression') {
      return (
        this.containsPipeContextRef(node.callee) ||
        node.arguments.some((a) => this.containsPipeContextRef(a))
      );
    }
    if (node.type === 'ObjectLiteral') {
      return node.properties.some((prop) => {
        if (prop.type === 'StandardProperty' || prop.type === 'ComputedProperty') {
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
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================================================

  protected abstract generateIdentifier(node: AST.Identifier): string;
  protected abstract generateMemberAccess(node: AST.MemberAccess): string;
  protected abstract generateIndexAccess(node: AST.IndexAccess): string;
  protected abstract generateSliceAccess(node: AST.SliceAccess): string;
  protected abstract generateSpreadAccess(node: AST.SpreadAccess): string;
  protected abstract generateFilterAccess(node: AST.FilterAccess): string;
  protected abstract generateMapTransform(node: AST.MapTransform): string;
  protected abstract generateRootAccess(node: AST.RootAccess): string;
  protected abstract generateParentAccess(node: AST.ParentAccess): string;
  protected abstract generateCurrentAccess(node: AST.CurrentAccess): string;
  protected abstract generateBindingAccess(node: AST.BindingAccess): string;
  protected abstract generatePipeExpression(node: AST.PipeExpression): string;
  protected abstract generateCallExpression(node: AST.CallExpression): string;
  protected abstract generateTypeAssertion(node: AST.TypeAssertion): string;
  protected abstract generateNonNullAssertion(node: AST.NonNullAssertion): string;
  protected abstract tryGeneratePipedCall(node: AST.Expression, pipeValue: string): string | null;

  // Factory method for creating child generators (for predicates, map templates)
  protected abstract createChildGenerator(inputVar: string): BaseCodeGenerator;
}
