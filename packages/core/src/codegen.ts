/**
 * Code Generator - Converts AST to JavaScript
 */

import * as AST from './ast.js';

export interface CodeGenOptions {
  /** Use strict mode (throws errors) vs forgiving mode (returns undefined) */
  strict?: boolean;
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
  /** Generate native JS without helper dependencies */
  native?: boolean;
}

const DEFAULT_OPTIONS: Required<CodeGenOptions> = {
  strict: false,
  pretty: true,
  inputVar: 'input',
  bindingsVar: 'bindings',
  parentVar: 'parent',
  wrapInFunction: true,
  functionName: 'transform',
  native: false,
};

export class CodeGenerator {
  private options: Required<CodeGenOptions>;
  private indent: number = 0;
  private localVariables: Set<string> = new Set();
  private currentPath: string[] = [];
  private pipeContextVar: string | null = null;
  private tempVarCounter: number = 0;

  constructor(options: CodeGenOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    // Native mode overrides strict - can't have helper-based validation in native JS
    if (this.options.native) {
      this.options.strict = false;
    }
  }

  private pushPath(segment: string): void {
    this.currentPath.push(segment);
  }

  private popPath(): void {
    this.currentPath.pop();
  }

  private getPath(): string {
    return this.currentPath.join('.');
  }

  private getPathString(): string {
    const path = this.getPath();
    return path ? JSON.stringify(path) : '""';
  }

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

  private generateProgram(program: AST.Program): string {
    const parts: string[] = [];

    // Generate let/const bindings
    for (const stmt of program.statements) {
      parts.push(this.generateLetBinding(stmt));
    }

    // Generate return expression
    if (program.expression) {
      // Check if expression is a pipe chain - if so, flatten it for readability
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

  /**
   * Flatten a pipe chain into sequential variable assignments for readability.
   * Transforms: a | b | c | d
   * Into:
   *   let _pipe = <a>;
   *   _pipe = <b applied to _pipe>;
   *   _pipe = <c applied to _pipe>;
   *   return <d applied to _pipe>;
   */
  private generateFlattenedPipeChain(node: AST.PipeExpression): string[] {
    // Collect all pipe steps from left to right
    const steps: AST.Expression[] = [];
    let current: AST.Expression = node;

    while (current.type === 'PipeExpression') {
      steps.unshift(current.right);
      current = current.left;
    }
    // current is now the initial value (leftmost expression)
    const initial = current;

    // Check if any step needs a pipe variable (ObjectLiteral, ArrayLiteral, or PipeContextRef)
    const needsPipeVar = steps.some(
      (step) =>
        step.type === 'ObjectLiteral' ||
        step.type === 'ArrayLiteral' ||
        this.containsPipeContextRef(step)
    );

    // If single pipe and no pipe variable needed, use simple inline generation
    if (steps.length === 1 && !needsPipeVar) {
      const expr = this.generateExpression(node);
      return [`return ${expr};`];
    }

    // Generate flattened code with a single _pipe variable
    const statements: string[] = [];
    const pipeVar = '_pipe';

    // First: let _pipe = <initial>;
    statements.push(`let ${pipeVar} = ${this.generateExpression(initial)};`);

    // Middle steps: _pipe = <transform applied to _pipe>;
    for (let i = 0; i < steps.length - 1; i++) {
      const step = steps[i];
      const transformed = this.generatePipeStep(step, pipeVar);
      statements.push(`${pipeVar} = ${transformed};`);
    }

    // Final step: return <transform applied to _pipe>;
    const lastStep = steps[steps.length - 1];
    const finalExpr = this.generatePipeStep(lastStep, pipeVar);
    statements.push(`return ${finalExpr};`);

    return statements;
  }

  /**
   * Generate code for a single pipe step, given the pipe variable name.
   */
  private generatePipeStep(step: AST.Expression, pipeVar: string): string {
    // Handle ObjectLiteral (pipe-to-object construction)
    // Always set pipeContextVar so shorthand properties and .field access work
    if (step.type === 'ObjectLiteral') {
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = pipeVar;
      const result = this.generateExpression(step);
      this.pipeContextVar = prevPipeVar;
      return result;
    }

    // Handle ArrayLiteral (pipe-to-array construction)
    // Always set pipeContextVar so shorthand identifiers and .field access work
    if (step.type === 'ArrayLiteral') {
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = pipeVar;
      const result = this.generateExpression(step);
      this.pipeContextVar = prevPipeVar;
      return result;
    }

    // Handle PipeContextRef-based expressions (jq-style: .field, .[0], .method())
    if (this.containsPipeContextRef(step)) {
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = pipeVar;
      const result = this.generateExpression(step);
      this.pipeContextVar = prevPipeVar;
      return result;
    }

    // Handle pipeable calls (Identifier, CallExpression, or wrapped in IndexAccess/SliceAccess)
    const pipedResult = this.tryGeneratePipedCall(step, pipeVar);
    if (pipedResult) {
      return pipedResult;
    }

    // Fallback: call the expression as a function
    const stepCode = this.generateExpression(step);
    return `${stepCode}(${pipeVar})`;
  }

  private generateLetBinding(node: AST.LetBinding): string {
    const keyword = node.constant ? 'const' : 'let';
    const value = this.generateExpression(node.value);
    // Register the variable as a local
    this.localVariables.add(node.name);
    return `${keyword} ${node.name} = ${value};`;
  }

  private generateExpression(node: AST.Expression): string {
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
        return this.generateMapTransform(node as AST.MapTransform);

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

  private generateTemplateLiteral(node: AST.TemplateLiteral): string {
    const parts = node.parts.map((part) => {
      if (typeof part === 'string') {
        // Escape backticks and ${
        return part.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      }
      return `\${${this.generateExpression(part)}}`;
    });
    return '`' + parts.join('') + '`';
  }

  private generateObjectLiteral(node: AST.ObjectLiteral): string {
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

  private generateArrayLiteral(node: AST.ArrayLiteral): string {
    if (node.elements.length === 0) return '[]';

    const elements = node.elements.map((el) => {
      if (el.type === 'SpreadElement') {
        return `...${this.generateExpression(el.argument)}`;
      }
      return this.generateExpression(el);
    });

    return `[${elements.join(', ')}]`;
  }

  private generateIdentifier(node: AST.Identifier): string {
    // Check if it's a local variable first
    if (this.localVariables.has(node.name)) {
      return node.name;
    }

    // Check for iteration context variables
    // These are available when inside [*] or [?] iterations
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

    // Check if it's accessing the input
    const input = this.options.inputVar;

    // In strict mode, use strictGet for validation
    if (this.options.strict) {
      return `__helpers.strictGet(${input}, "${node.name}", "")`;
    }
    return `${input}?.${node.name}`;
  }

  private generateMemberAccess(node: AST.MemberAccess): string {
    // Special case: SpreadAccess followed by MemberAccess = map operation
    if (node.object.type === 'SpreadAccess') {
      const array = this.generateExpression(node.object.object);
      if (this.options.strict) {
        const path = this.buildPathFromNode(node.object.object);
        return `__helpers.strictMap(${array}, (item, index, arr) => __helpers.strictGet(item, "${node.property}", "${path}[*]"), "${path}")`;
      }
      return `(${array} ?? []).map((item, index, arr) => item?.${node.property})`;
    }

    const object = this.generateExpression(node.object);

    // In strict mode, use strictGet for validation with path info
    if (this.options.strict && !node.optional) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictGet(${object}, "${node.property}", "${path}")`;
    }

    const op = node.optional || !this.options.strict ? '?.' : '.';
    return `${object}${op}${node.property}`;
  }

  /**
   * Try to extract a property path from an expression
   * Returns the path string if it's a simple identifier or member chain, null otherwise
   * e.g., price → "price", meta.priority → "meta.priority"
   * Also supports dot-prefix: .price → "price", .meta.priority → "meta.priority"
   */
  private tryExtractPropertyPath(node: AST.Expression): string | null {
    // Handle dot-prefix syntax: .price or .meta.priority
    if (node.type === 'CurrentAccess') {
      return node.path ?? null;
    }

    // Handle PipeContextRef-based paths: | sort(.price) or | sort(.meta.priority)
    if (node.type === 'PipeContextRef') {
      // PipeContextRef alone represents the pipe value itself, not a path
      return '';
    }

    // Handle .prop.nested (CurrentAccess or PipeContextRef followed by MemberAccess chain)
    if (node.type === 'MemberAccess' && !node.optional) {
      // Handle PipeContextRef.property: .price → "price"
      if (node.object.type === 'PipeContextRef') {
        return node.property;
      }
      if (node.object.type === 'CurrentAccess' && node.object.path) {
        return `${node.object.path}.${node.property}`;
      }
      const objectPath = this.tryExtractPropertyPath(node.object);
      if (objectPath !== null) {
        // If objectPath is empty (from PipeContextRef), just return property
        return objectPath === '' ? node.property : `${objectPath}.${node.property}`;
      }
    }

    // Handle bare identifier: price
    if (node.type === 'Identifier') {
      // Only treat as path if not a local variable
      if (this.localVariables.has(node.name)) {
        return null;
      }
      return node.name;
    }

    return null;
  }

  /**
   * Build a path string from an AST node for error messages
   */
  private buildPathFromNode(node: AST.Expression): string {
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

  private generateIndexAccess(node: AST.IndexAccess): string {
    const object = this.generateExpression(node.object);
    const index = this.generateExpression(node.index);

    // In strict mode, use strictIndex for validation
    if (this.options.strict && !node.optional) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictIndex(${object}, ${index}, "${path}")`;
    }

    const op = node.optional || !this.options.strict ? '?.' : '';
    return `${object}${op}[${index}]`;
  }

  private generateSliceAccess(node: AST.SliceAccess): string {
    const object = this.generateExpression(node.object);
    const start = node.sliceStart ? this.generateExpression(node.sliceStart) : '0';
    const end = node.sliceEnd ? this.generateExpression(node.sliceEnd) : '';

    if (this.options.strict) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictArray(${object}, "${path}").slice(${start}${end ? ', ' + end : ''})`;
    }
    return `(${object} ?? []).slice(${start}${end ? ', ' + end : ''})`;
  }

  private generateSpreadAccess(node: AST.SpreadAccess): string {
    const object = this.generateExpression(node.object);

    if (this.options.strict) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictArray(${object}, "${path}")`;
    }
    return `(${object} ?? [])`;
  }

  private generateFilterAccess(node: AST.FilterAccess): string {
    const object = this.generateExpression(node.object);

    // The predicate needs to be converted to a function
    // that operates on each item
    const predicateCode = this.generatePredicateFunction(node.predicate);

    if (this.options.strict) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictFilter(${object}, ${predicateCode}, "${path}")`;
    }
    return `(${object} ?? []).filter(${predicateCode})`;
  }

  private generateMapTransform(node: AST.MapTransform): string {
    const array = this.generateExpression(node.array);
    const path = this.buildPathFromNode(node.array);

    // Generate the template with 'item' as the context
    const templateGen = new CodeGenerator({
      ...this.options,
      inputVar: 'item',
      wrapInFunction: false,
    });

    const templateCode = templateGen.generateObjectLiteralForMap(node.template);

    if (this.options.strict) {
      return `__helpers.strictMap(${array}, (item, index, arr) => (${templateCode}), "${path}")`;
    }
    return `(${array} ?? []).map((item, index, arr) => (${templateCode}))`;
  }

  private generateObjectLiteralForMap(node: AST.ObjectLiteral): string {
    if (node.properties.length === 0) return '{}';

    const props = node.properties.map((prop) => {
      switch (prop.type) {
        case 'StandardProperty':
          const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key)
            ? prop.key
            : JSON.stringify(prop.key);
          return `${key}: ${this.generateExpression(prop.value)}`;

        case 'ShorthandProperty':
          // In map context, shorthand refers to item.key
          return `${prop.key}: item?.${prop.key}`;

        case 'ComputedProperty':
          return `[${this.generateExpression(prop.key)}]: ${this.generateExpression(prop.value)}`;

        case 'SpreadProperty':
          return `...${this.generateExpression(prop.argument)}`;
      }
    });

    return `{ ${props.join(', ')} }`;
  }

  private generatePredicateFunction(predicate: AST.Expression): string {
    // Create a code generator with item context
    const itemGen = new CodeGenerator({
      ...this.options,
      inputVar: 'item',
      wrapInFunction: false,
    });

    const body = itemGen.generateExpression(predicate);
    return `(item, index, arr) => ${body}`;
  }

  private generateRootAccess(node: AST.RootAccess): string {
    const input = this.options.inputVar;

    if (node.path === null) {
      return input;
    }

    if (this.options.strict) {
      return `${input}.${node.path}`;
    }
    return `${input}?.${node.path}`;
  }

  private generateParentAccess(node: AST.ParentAccess): string {
    const parent = this.options.parentVar;

    if (node.path === null) {
      return parent;
    }

    if (this.options.strict) {
      return `${parent}.${node.path}`;
    }
    return `${parent}?.${node.path}`;
  }

  private generateCurrentAccess(node: AST.CurrentAccess): string {
    const input = this.options.inputVar;

    if (node.path === null) {
      return input;
    }

    if (this.options.strict) {
      return `${input}.${node.path}`;
    }
    return `${input}?.${node.path}`;
  }

  private generateBindingAccess(node: AST.BindingAccess): string {
    const bindings = this.options.bindingsVar;

    if (this.options.strict) {
      return `${bindings}.${node.name}`;
    }
    return `${bindings}?.${node.name}`;
  }

  /**
   * Check if an AST node can produce null/undefined (needs ?? '' for concat)
   */
  private canBeNullish(node: AST.Expression): boolean {
    switch (node.type) {
      case 'StringLiteral':
      case 'NumberLiteral':
      case 'BooleanLiteral':
      case 'TemplateLiteral':
      case 'ArrayLiteral':
      case 'ObjectLiteral':
        return false;
      case 'BinaryExpression':
        // Concat and arithmetic results are never null
        if (node.operator === '&' || ['+', '-', '*', '/', '%'].includes(node.operator)) {
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  /**
   * Wrap expression for string concat - only add ?? '' if needed
   */
  private wrapForConcat(node: AST.Expression, generated: string): string {
    return this.canBeNullish(node) ? `(${generated} ?? '')` : generated;
  }

  private generateBinaryExpression(node: AST.BinaryExpression): string {
    const op = node.operator;

    // Handle string concatenation with & using template literals
    if (op === '&') {
      return this.generateConcatenation(node);
    }

    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);

    // Handle 'in' operator
    if (op === 'in') {
      return `(${right}).includes(${left})`;
    }

    return `(${left} ${op} ${right})`;
  }

  /**
   * Flatten a chain of & concatenations into an array of expressions
   */
  private flattenConcatenation(node: AST.Expression): AST.Expression[] {
    if (node.type === 'BinaryExpression' && node.operator === '&') {
      return [...this.flattenConcatenation(node.left), ...this.flattenConcatenation(node.right)];
    }
    return [node];
  }

  /**
   * Generate string concatenation using template literals
   */
  private generateConcatenation(node: AST.BinaryExpression): string {
    const parts = this.flattenConcatenation(node);

    // Build template literal
    let template = '`';
    for (const part of parts) {
      if (part.type === 'StringLiteral') {
        // Escape backticks and ${} in string literals
        const escaped = (part.value as string)
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\$\{/g, '\\${');
        template += escaped;
      } else {
        // Wrap expression - add nullish coalescing for safety
        const generated = this.generateExpression(part);
        const wrapped = this.canBeNullish(part) ? `${generated} ?? ''` : generated;
        template += '${' + wrapped + '}';
      }
    }
    template += '`';

    return template;
  }

  private generateUnaryExpression(node: AST.UnaryExpression): string {
    const argument = this.generateExpression(node.argument);
    let op = node.operator;

    if (op === 'not') op = '!';

    return `${op}${argument}`;
  }

  private generateTernaryExpression(node: AST.TernaryExpression): string {
    const test = this.generateExpression(node.test);
    const consequent = this.generateExpression(node.consequent);
    const alternate = this.generateExpression(node.alternate);

    return `(${test} ? ${consequent} : ${alternate})`;
  }

  private generatePipeExpression(node: AST.PipeExpression): string {
    const left = this.generateExpression(node.left);

    // ObjectLiteral on right side always uses IIFE pattern (pipe-to-object construction)
    // This handles: value | { }, value | { id: .id }, value | { "key": "value" }
    if (node.right.type === 'ObjectLiteral') {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      // Arrow fn returning object needs extra parens: (() => ({ }))
      return `(((${tempVar}) => (${right}))(${left}))`;
    }

    // ArrayLiteral on right side uses IIFE pattern (pipe-to-array construction)
    // This handles: value | [], value | [.id, .name], value | [id, name]
    if (node.right.type === 'ArrayLiteral') {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      return `(((${tempVar}) => ${right})(${left}))`;
    }

    // Check if right side contains PipeContextRef (jq-style property access)
    if (this.containsPipeContextRef(node.right)) {
      // Generate with temp variable using IIFE to declare the variable
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;

      // Wrap in IIFE to declare the temp variable
      return `(((${tempVar}) => ${right})(${left}))`;
    }

    // Try to generate a piped call (handles Identifier, CallExpression, and wrapped versions)
    const pipedResult = this.tryGeneratePipedCall(node.right, left);
    if (pipedResult) {
      return pipedResult;
    }

    // Fallback: just call it
    const right = this.generateExpression(node.right);
    return `${right}(${left})`;
  }

  /**
   * Try to generate a piped function call, handling wrappers like IndexAccess and SliceAccess.
   * This allows expressions like: value | split("")[0] or value | take(5)[0]
   */
  private tryGeneratePipedCall(node: AST.Expression, pipeValue: string): string | null {
    // Direct identifier: value | funcName
    if (node.type === 'Identifier') {
      const funcName = node.name;
      if (this.options.native) {
        const nativeCode = this.generateNativeHelperCall(funcName, [pipeValue]);
        if (nativeCode) return nativeCode;
      }
      return `__helpers.${funcName}(${pipeValue})`;
    }

    // Direct call: value | funcName(args)
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const funcName = node.callee.name;

      // Handle sort/groupBy/keyBy with property path argument: value | sort(.price)
      const helperMethods = ['sort', 'sortDesc', 'groupBy', 'keyBy'];
      if (helperMethods.includes(funcName) && node.arguments.length === 1) {
        const arg = node.arguments[0];
        let keyPath: string | null = null;

        // Handle string literal: value | sort("price")
        if (arg.type === 'StringLiteral') {
          keyPath = arg.value;
        } else {
          // Handle .price or .meta.priority (PipeContextRef-based paths)
          keyPath = this.tryExtractPropertyPath(arg);
        }

        if (keyPath !== null && keyPath !== '') {
          if (this.options.native) {
            return this.generateNativeArrayMethod(pipeValue, funcName, keyPath);
          }
          return `__helpers.${funcName}(${pipeValue}, "${keyPath}")`;
        }
      }

      const args = node.arguments.map((a) => this.generateExpression(a));

      if (this.options.native) {
        const nativeCode = this.generateNativeHelperCall(funcName, [pipeValue, ...args]);
        if (nativeCode) return nativeCode;
      }
      return `__helpers.${funcName}(${pipeValue}${args.length ? ', ' + args.join(', ') : ''})`;
    }

    // Index access wrapping a pipeable call: value | funcName(args)[index]
    if (node.type === 'IndexAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const index = this.generateExpression(node.index);
        const op = node.optional || !this.options.strict ? '?.' : '';
        return `${innerResult}${op}[${index}]`;
      }
    }

    // Slice access wrapping a pipeable call: value | funcName(args)[start:end]
    if (node.type === 'SliceAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const start = node.sliceStart ? this.generateExpression(node.sliceStart) : '0';
        const end = node.sliceEnd ? this.generateExpression(node.sliceEnd) : '';
        return `(${innerResult}).slice(${start}${end ? ', ' + end : ''})`;
      }
    }

    return null;
  }

  private containsPipeContextRef(node: AST.Expression): boolean {
    if (node.type === 'PipeContextRef') return true;
    if (node.type === 'MemberAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'IndexAccess') return this.containsPipeContextRef(node.object);
    if (node.type === 'CallExpression') {
      return (
        this.containsPipeContextRef(node.callee) ||
        node.arguments.some((a) => this.containsPipeContextRef(a))
      );
    }
    // Check inside object literals
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
    // Check inside array literals
    if (node.type === 'ArrayLiteral') {
      return node.elements.some((el) => {
        if (el.type === 'SpreadElement') {
          return this.containsPipeContextRef(el.argument);
        }
        return this.containsPipeContextRef(el);
      });
    }
    // Check binary expressions
    if (node.type === 'BinaryExpression') {
      return this.containsPipeContextRef(node.left) || this.containsPipeContextRef(node.right);
    }
    // Check ternary expressions
    if (node.type === 'TernaryExpression') {
      return (
        this.containsPipeContextRef(node.test) ||
        this.containsPipeContextRef(node.consequent) ||
        this.containsPipeContextRef(node.alternate)
      );
    }
    // Check pipe expressions (nested pipes)
    if (node.type === 'PipeExpression') {
      return this.containsPipeContextRef(node.left) || this.containsPipeContextRef(node.right);
    }
    return false;
  }

  private getTempVar(prefix: string): string {
    return `${prefix}${this.tempVarCounter++}`;
  }

  private generateNullCoalesce(node: AST.NullCoalesce): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);

    return `(${left} ?? ${right})`;
  }

  /**
   * Generate native JS code for a helper function call
   * Returns null if no native equivalent available
   */
  private generateNativeHelperCall(
    funcName: string,
    args: string[],
    keyPath?: string
  ): string | null {
    // String functions
    if (funcName === 'upper') return `String(${args[0]} ?? '').toUpperCase()`;
    if (funcName === 'lower') return `String(${args[0]} ?? '').toLowerCase()`;
    if (funcName === 'trim') return `String(${args[0]} ?? '').trim()`;
    if (funcName === 'split') return `String(${args[0]} ?? '').split(${args[1] ?? '","'})`;
    if (funcName === 'join') return `${args[0]}?.join(${args[1] ?? '","'}) ?? ''`;
    if (funcName === 'substring')
      return `String(${args[0]} ?? '').substring(${args.slice(1).join(', ')})`;
    if (funcName === 'replace') return `String(${args[0]} ?? '').replace(${args[1]}, ${args[2]})`;
    if (funcName === 'replaceAll')
      return `String(${args[0]} ?? '').replaceAll(${args[1]}, ${args[2]})`;
    if (funcName === 'startsWith') return `String(${args[0]} ?? '').startsWith(${args[1]})`;
    if (funcName === 'endsWith') return `String(${args[0]} ?? '').endsWith(${args[1]})`;
    if (funcName === 'contains') return `String(${args[0]} ?? '').includes(${args[1]})`;
    if (funcName === 'padStart')
      return `String(${args[0]} ?? '').padStart(${args.slice(1).join(', ')})`;
    if (funcName === 'padEnd')
      return `String(${args[0]} ?? '').padEnd(${args.slice(1).join(', ')})`;

    // Math functions
    if (funcName === 'round')
      return args.length > 1
        ? `(Math.round(Number(${args[0]}) * Math.pow(10, ${args[1]})) / Math.pow(10, ${args[1]}))`
        : `Math.round(Number(${args[0]}))`;
    if (funcName === 'floor') return `Math.floor(Number(${args[0]}))`;
    if (funcName === 'ceil') return `Math.ceil(Number(${args[0]}))`;
    if (funcName === 'abs') return `Math.abs(Number(${args[0]}))`;
    if (funcName === 'min') return `Math.min(...[${args.join(', ')}].flat())`;
    if (funcName === 'max') return `Math.max(...[${args.join(', ')}].flat())`;

    // Array functions - native methods with callbacks (use ?. for clean chaining)
    if (funcName === 'map') return `${args[0]}?.map(${args[1]})`;
    if (funcName === 'filter') return `${args[0]}?.filter(${args[1]})`;
    if (funcName === 'find') return `${args[0]}?.find(${args[1]})`;
    if (funcName === 'some') return `${args[0]}?.some(${args[1]})`;
    if (funcName === 'every') return `${args[0]}?.every(${args[1]})`;
    if (funcName === 'reduce')
      return `(${args[0]} ?? []).reduce(${args[1]}, ${args[2] ?? 'undefined'})`;

    // Array functions - simple (use ?. for clean chaining)
    if (funcName === 'count') return `${args[0]}?.length ?? 0`;
    if (funcName === 'first') return `${args[0]}?.[0]`;
    if (funcName === 'last') return `${args[0]}?.at(-1)`;
    if (funcName === 'unique') return `[...new Set(${args[0]} ?? [])]`;
    if (funcName === 'flatten') return `${args[0]}?.flat()`;
    if (funcName === 'reverse') return `[...(${args[0]} ?? [])].reverse()`;
    if (funcName === 'compact') return `${args[0]}?.filter(x => x != null)`;
    if (funcName === 'take') return `${args[0]}?.slice(0, ${args[1]})`;
    if (funcName === 'drop') return `${args[0]}?.slice(${args[1]})`;
    if (funcName === 'sum') return `${args[0]}?.reduce((a, b) => a + Number(b || 0), 0) ?? 0`;
    if (funcName === 'avg')
      return `((arr) => arr.length ? arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length : 0)(${args[0]} ?? [])`;

    // Sort with key path
    if (funcName === 'sort' && keyPath) {
      const pathParts = keyPath.split('.');
      const getValue =
        pathParts.length === 1
          ? `item?.${keyPath}`
          : `((obj) => { ${pathParts.map((p) => `obj = obj?.${p}`).join('; ')}; return obj; })(item)`;
      return `[...(${args[0]} ?? [])].sort((a, b) => { const aVal = ((item) => ${getValue})(a), bVal = ((item) => ${getValue})(b); return aVal == null ? 1 : bVal == null ? -1 : aVal < bVal ? -1 : aVal > bVal ? 1 : 0; })`;
    }
    if (funcName === 'sortDesc' && keyPath) {
      const pathParts = keyPath.split('.');
      const getValue =
        pathParts.length === 1
          ? `item?.${keyPath}`
          : `((obj) => { ${pathParts.map((p) => `obj = obj?.${p}`).join('; ')}; return obj; })(item)`;
      return `[...(${args[0]} ?? [])].sort((a, b) => { const aVal = ((item) => ${getValue})(a), bVal = ((item) => ${getValue})(b); return aVal == null ? 1 : bVal == null ? -1 : bVal < aVal ? -1 : bVal > aVal ? 1 : 0; })`;
    }

    // GroupBy with key path
    if (funcName === 'groupBy' && keyPath) {
      const pathParts = keyPath.split('.');
      const getValue =
        pathParts.length === 1
          ? `item?.${keyPath}`
          : `((obj) => { ${pathParts.map((p) => `obj = obj?.${p}`).join('; ')}; return obj; })(item)`;
      return `(${args[0]} ?? []).reduce((acc, item) => { const key = String(${getValue}); (acc[key] = acc[key] || []).push(item); return acc; }, {})`;
    }

    // KeyBy with key path
    if (funcName === 'keyBy' && keyPath) {
      const pathParts = keyPath.split('.');
      const getValue =
        pathParts.length === 1
          ? `item?.${keyPath}`
          : `((obj) => { ${pathParts.map((p) => `obj = obj?.${p}`).join('; ')}; return obj; })(item)`;
      return `(${args[0]} ?? []).reduce((acc, item) => { acc[String(${getValue})] = item; return acc; }, {})`;
    }

    // Object functions
    if (funcName === 'keys') return `Object.keys(${args[0]} ?? {})`;
    if (funcName === 'values') return `Object.values(${args[0]} ?? {})`;
    if (funcName === 'entries') return `Object.entries(${args[0]} ?? {})`;
    if (funcName === 'merge') return `Object.assign({}, ${args.join(', ')})`;

    // Type functions
    if (funcName === 'type')
      return `(v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)(${args[0]})`;
    if (funcName === 'isString') return `typeof ${args[0]} === 'string'`;
    if (funcName === 'isNumber') return `typeof ${args[0]} === 'number' && !isNaN(${args[0]})`;
    if (funcName === 'isBoolean') return `typeof ${args[0]} === 'boolean'`;
    if (funcName === 'isArray') return `Array.isArray(${args[0]})`;
    if (funcName === 'isObject')
      return `${args[0]} !== null && typeof ${args[0]} === 'object' && !Array.isArray(${args[0]})`;
    if (funcName === 'isNull') return `${args[0]} === null`;
    if (funcName === 'isUndefined') return `${args[0]} === undefined`;
    if (funcName === 'isEmpty')
      return `((v) => v == null || (typeof v === 'string' && v.length === 0) || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && Object.keys(v).length === 0))(${args[0]})`;

    // Conversion functions
    if (funcName === 'toString')
      return `(${args[0]} == null ? '' : typeof ${args[0]} === 'object' ? JSON.stringify(${args[0]}) : String(${args[0]}))`;
    if (funcName === 'toNumber') return `Number(${args[0]}) || 0`;
    if (funcName === 'toBoolean') return `Boolean(${args[0]})`;
    if (funcName === 'toArray')
      return `(${args[0]} == null ? [] : Array.isArray(${args[0]}) ? ${args[0]} : [${args[0]}])`;
    if (funcName === 'toJSON') return `JSON.stringify(${args[0]})`;
    if (funcName === 'fromJSON') return `JSON.parse(${args[0]})`;

    // Utility
    if (funcName === 'coalesce') return `[${args.join(', ')}].find(v => v != null)`;

    return null;
  }

  /**
   * Generate native JS for array methods called on SpreadAccess: arr[].sort(key)
   */
  private generateNativeArrayMethod(array: string, method: string, keyPath: string): string {
    const pathParts = keyPath.split('.');

    // Generate clean property access: a.price or a.meta.priority
    const getProp = (varName: string) =>
      pathParts.length === 1 ? `${varName}.${keyPath}` : `${varName}.${pathParts.join('.')}`;

    // Check if array already has null coalescing (from SpreadAccess or pipe)
    const safeArray = array.includes('?? []') ? array : `(${array} ?? [])`;

    if (method === 'sort') {
      return `[...${safeArray}].sort((a, b) => ${getProp('a')} - ${getProp('b')})`;
    }

    if (method === 'sortDesc') {
      return `[...${safeArray}].sort((a, b) => ${getProp('b')} - ${getProp('a')})`;
    }

    if (method === 'groupBy') {
      return `${safeArray}.reduce((acc, item) => { const key = String(${getProp('item')}); (acc[key] = acc[key] || []).push(item); return acc; }, {})`;
    }

    if (method === 'keyBy') {
      return `${safeArray}.reduce((acc, item) => { acc[String(${getProp('item')})] = item; return acc; }, {})`;
    }

    // Fallback - shouldn't reach here
    return `${safeArray}.${method}("${keyPath}")`;
  }

  private generateCallExpression(node: AST.CallExpression): string {
    const args = node.arguments.map((a) => this.generateExpression(a));

    // Check if callee is a built-in helper (identifier without dots)
    if (node.callee.type === 'Identifier') {
      const funcName = node.callee.name;

      // In native mode, try to generate native JS
      if (this.options.native) {
        const nativeCode = this.generateNativeHelperCall(funcName, args);
        if (nativeCode) return nativeCode;
      }

      return `__helpers.${funcName}(${args.join(', ')})`;
    }

    // Handle SpreadAccess.method() pattern: arr[*].map(fn) or arr[].filter(fn)
    // This should call the method on the array, not map over items
    if (node.callee.type === 'MemberAccess' && node.callee.object.type === 'SpreadAccess') {
      const array = this.generateExpression(node.callee.object.object);
      const method = node.callee.property;

      // Special handling for sort/sortDesc/groupBy/keyBy with key argument
      // e.g., orders[].sort(price) → __helpers.sort(orders, "price")
      // e.g., orders[].sort(meta.priority) → __helpers.sort(orders, "meta.priority")
      // e.g., orders[].sort("price") → __helpers.sort(orders, "price")
      const helperMethods = ['sort', 'sortDesc', 'groupBy', 'keyBy'];
      if (helperMethods.includes(method) && node.arguments.length === 1) {
        const arg = node.arguments[0];
        let keyPath: string | null = null;

        // Handle string literal: orders[].sort("price")
        if (arg.type === 'StringLiteral') {
          keyPath = arg.value;
        } else {
          // Handle bare identifier or member access: orders[].sort(price) or orders[].sort(meta.priority)
          keyPath = this.tryExtractPropertyPath(arg);
        }

        if (keyPath !== null) {
          // Native mode: generate pure JS without helpers
          if (this.options.native) {
            return this.generateNativeArrayMethod(array, method, keyPath);
          }

          if (this.options.strict) {
            const path = this.buildPathFromNode(node.callee.object.object);
            return `__helpers.${method}(__helpers.strictArray(${array}, "${path}"), "${keyPath}")`;
          }
          return `__helpers.${method}(${array} ?? [], "${keyPath}")`;
        }
      }

      if (this.options.strict) {
        const path = this.buildPathFromNode(node.callee.object.object);
        return `__helpers.strictArray(${array}, "${path}").${method}(${args.join(', ')})`;
      }
      return `(${array} ?? []).${method}(${args.join(', ')})`;
    }

    const callee = this.generateExpression(node.callee);
    return `${callee}(${args.join(', ')})`;
  }

  private generateArrowFunction(node: AST.ArrowFunction): string {
    const params = node.params.map((p) => p.name).join(', ');

    // Save current local variables
    const savedLocals = new Set(this.localVariables);

    // Register arrow function parameters as local variables
    for (const param of node.params) {
      this.localVariables.add(param.name);
    }

    // Generate body with params registered as locals
    const body = this.generateExpression(node.body);

    // Restore previous local variables
    this.localVariables = savedLocals;

    return `(${params}) => ${body}`;
  }

  private generateIfExpression(node: AST.IfExpression): string {
    // Convert to nested ternary
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

  private generateTypeAssertion(node: AST.TypeAssertion): string {
    const expr = this.generateExpression(node.expression);

    if (this.options.strict) {
      // Generate runtime type check
      const typeCheck = this.generateTypeCheck(expr, node.typeAnnotation);
      return `(${typeCheck})`;
    }

    // In forgiving mode, just pass through
    return expr;
  }

  private generateTypeCheck(expr: string, type: AST.TypeAnnotation): string {
    switch (type.type) {
      case 'PrimitiveType':
        if (type.nonNull) {
          return `__helpers.assertType(${expr}, '${type.name}', true)`;
        }
        return `__helpers.assertType(${expr}, '${type.name}')`;

      case 'ArrayType':
        return `__helpers.assertArray(${expr})`;

      default:
        return expr;
    }
  }

  private generateNonNullAssertion(node: AST.NonNullAssertion): string {
    const expr = this.generateExpression(node.expression);

    if (this.options.strict) {
      return `__helpers.assertNonNull(${expr})`;
    }

    return expr;
  }

  private indentCode(code: string, levels: number): string {
    const indent = '  '.repeat(levels);
    return code
      .split('\n')
      .map((line) => indent + line)
      .join('\n');
  }
}

export function generate(program: AST.Program, options?: CodeGenOptions): string {
  return new CodeGenerator(options).generate(program);
}
