/**
 * MapQL Code Generator - Converts AST to JavaScript
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
}

const DEFAULT_OPTIONS: Required<CodeGenOptions> = {
  strict: false,
  pretty: true,
  inputVar: 'input',
  bindingsVar: 'bindings',
  parentVar: 'parent',
  wrapInFunction: true,
  functionName: 'transform',
};

export class CodeGenerator {
  private options: Required<CodeGenOptions>;
  private indent: number = 0;
  private localVariables: Set<string> = new Set();
  private currentPath: string[] = [];

  constructor(options: CodeGenOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
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
      const expr = this.generateExpression(program.expression);
      parts.push(`return ${expr};`);
    }

    return parts.join('\n');
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
        return `__helpers.strictMap(${array}, item => __helpers.strictGet(item, "${node.property}", "${path}[*]"), "${path}")`;
      }
      return `(${array} ?? []).map(item => item?.${node.property})`;
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
    return `(item) => ${body}`;
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

  private generateBinaryExpression(node: AST.BinaryExpression): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);

    let op = node.operator;

    // Handle string concatenation with &
    if (op === '&') {
      return `String(${left}) + String(${right})`;
    }

    // Handle 'in' operator
    if (op === 'in') {
      return `(${right}).includes(${left})`;
    }

    return `(${left} ${op} ${right})`;
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

    // The right side should be a function call or identifier
    if (node.right.type === 'Identifier') {
      // Call as function with left as first argument
      return `__helpers.${node.right.name}(${left})`;
    }

    if (node.right.type === 'CallExpression') {
      // Insert left as first argument
      const callee = this.generateExpression(node.right.callee);
      const args = node.right.arguments.map((a) => this.generateExpression(a));
      return `__helpers.${callee}(${left}, ${args.join(', ')})`;
    }

    // Fallback: just call it
    const right = this.generateExpression(node.right);
    return `${right}(${left})`;
  }

  private generateNullCoalesce(node: AST.NullCoalesce): string {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);

    return `(${left} ?? ${right})`;
  }

  private generateCallExpression(node: AST.CallExpression): string {
    const args = node.arguments.map((a) => this.generateExpression(a));

    // Check if callee is a built-in helper (identifier without dots)
    if (node.callee.type === 'Identifier') {
      const funcName = node.callee.name;
      return `__helpers.${funcName}(${args.join(', ')})`;
    }

    const callee = this.generateExpression(node.callee);
    return `${callee}(${args.join(', ')})`;
  }

  private generateArrowFunction(node: AST.ArrowFunction): string {
    const params = node.params.map((p) => p.name).join(', ');
    const body = this.generateExpression(node.body);

    if (node.params.length === 1) {
      return `(${params}) => ${body}`;
    }
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

    const alternate = node.alternate
      ? this.generateExpression(node.alternate)
      : 'undefined';

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
