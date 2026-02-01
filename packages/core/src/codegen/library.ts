/**
 * Library Code Generator - Generates JavaScript with __helpers runtime
 * Supports strict mode with enhanced error messages
 */

import * as AST from '../ast.js';
import { BaseCodeGenerator, CodeGenOptions } from './base.js';

export interface LibraryCodeGenOptions extends CodeGenOptions {
  /** Use strict mode (throws errors) vs forgiving mode (returns undefined) */
  strict?: boolean;
}

export class LibraryCodeGenerator extends BaseCodeGenerator {
  protected strict: boolean;

  constructor(options: LibraryCodeGenOptions = {}) {
    super(options);
    this.strict = options.strict ?? false;
  }

  // ============================================================================
  // IDENTIFIER
  // ============================================================================

  protected generateIdentifier(node: AST.Identifier): string {
    if (this.localVariables.has(node.name)) {
      return node.name;
    }

    // Iteration context variables
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

    const input = this.options.inputVar;

    if (this.strict) {
      return `__helpers.strictGet(${input}, "${node.name}", "")`;
    }
    return `${input}?.${node.name}`;
  }

  // ============================================================================
  // MEMBER ACCESS
  // ============================================================================

  protected generateMemberAccess(node: AST.MemberAccess): string {
    // SpreadAccess + MemberAccess = map operation
    if (node.object.type === 'SpreadAccess') {
      const array = this.generateExpression(node.object.object);
      if (this.strict) {
        const path = this.buildPathFromNode(node.object.object);
        return `__helpers.strictMap(${array}, (item, index, arr) => __helpers.strictGet(item, "${node.property}", "${path}[*]"), "${path}")`;
      }
      return `(${array} ?? []).map((item, index, arr) => item?.${node.property})`;
    }

    // FilterAccess + MemberAccess = filter then map
    if (node.object.type === 'FilterAccess') {
      const filterExpr = this.generateFilterAccess(node.object);
      if (this.strict) {
        const path = this.buildPathFromNode(node.object.object);
        return `(${filterExpr}).map((item, index, arr) => __helpers.strictGet(item, "${node.property}", "${path}[?]"))`;
      }
      return `(${filterExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    // SliceAccess + MemberAccess = slice then map
    if (node.object.type === 'SliceAccess') {
      const sliceExpr = this.generateSliceAccess(node.object);
      if (this.strict) {
        const path = this.buildPathFromNode(node.object.object);
        return `(${sliceExpr}).map((item, index, arr) => __helpers.strictGet(item, "${node.property}", "${path}[:]"))`;
      }
      return `(${sliceExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    // CallExpression (array method) + MemberAccess = call then map
    // But skip if the property is itself a method name (method chaining like .filter().map())
    if (
      node.object.type === 'CallExpression' &&
      this.isArrayReturningCall(node.object) &&
      !BaseCodeGenerator.ARRAY_RETURNING_METHODS.has(node.property)
    ) {
      const callExpr = this.generateExpression(node.object);
      if (this.strict) {
        return `(${callExpr}).map((item, index, arr) => __helpers.strictGet(item, "${node.property}", ""))`;
      }
      return `(${callExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    // Chained property after array-producing operation
    if (node.object.type === 'MemberAccess' && this.isArrayProducingMemberAccess(node.object)) {
      const arrayExpr = this.generateExpression(node.object);
      if (this.strict) {
        return `(${arrayExpr}).map((item, index, arr) => __helpers.strictGet(item, "${node.property}", ""))`;
      }
      return `(${arrayExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    const object = this.generateExpression(node.object);

    if (this.strict && !node.optional) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictGet(${object}, "${node.property}", "${path}")`;
    }

    const op = node.optional || !this.strict ? '?.' : '.';
    return `${object}${op}${node.property}`;
  }

  // ============================================================================
  // INDEX ACCESS
  // ============================================================================

  protected generateIndexAccess(node: AST.IndexAccess): string {
    const object = this.generateExpression(node.object);
    const index = this.generateExpression(node.index);

    if (this.strict && !node.optional) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictIndex(${object}, ${index}, "${path}")`;
    }

    const op = node.optional || !this.strict ? '?.' : '';
    return `${object}${op}[${index}]`;
  }

  // ============================================================================
  // SLICE ACCESS
  // ============================================================================

  protected generateSliceAccess(node: AST.SliceAccess): string {
    const object = this.generateExpression(node.object);
    const start = node.sliceStart ? this.generateExpression(node.sliceStart) : '0';
    const end = node.sliceEnd ? this.generateExpression(node.sliceEnd) : '';

    if (this.strict) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictArray(${object}, "${path}").slice(${start}${end ? ', ' + end : ''})`;
    }
    return `(${object} ?? []).slice(${start}${end ? ', ' + end : ''})`;
  }

  // ============================================================================
  // SPREAD ACCESS
  // ============================================================================

  protected generateSpreadAccess(node: AST.SpreadAccess): string {
    const object = this.generateExpression(node.object);

    if (this.strict) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictArray(${object}, "${path}")`;
    }
    return `(${object} ?? [])`;
  }

  // ============================================================================
  // FILTER ACCESS
  // ============================================================================

  protected generateFilterAccess(node: AST.FilterAccess): string {
    const object = this.generateExpression(node.object);
    const predicateCode = this.generatePredicateFunction(node.predicate);

    if (this.strict) {
      const path = this.buildPathFromNode(node.object);
      return `__helpers.strictFilter(${object}, ${predicateCode}, "${path}")`;
    }
    return `(${object} ?? []).filter(${predicateCode})`;
  }

  protected generatePredicateFunction(predicate: AST.Expression): string {
    const childGen = this.createChildGenerator('item');
    const body = childGen.generateExpressionPublic(predicate);
    return `(item, index, arr) => ${body}`;
  }

  public generateExpressionPublic(node: AST.Expression): string {
    return this.generateExpression(node);
  }

  // ============================================================================
  // MAP TRANSFORM
  // ============================================================================

  protected generateMapTransform(node: AST.MapTransform): string {
    const array = this.generateExpression(node.array);
    const path = this.buildPathFromNode(node.array);
    const childGen = this.createChildGenerator('item');
    const templateCode = childGen.generateObjectLiteralForMap(node.template);

    if (this.strict) {
      return `__helpers.strictMap(${array}, (item, index, arr) => (${templateCode}), "${path}")`;
    }
    return `(${array} ?? []).map((item, index, arr) => (${templateCode}))`;
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
  // CONTEXT ACCESS
  // ============================================================================

  protected generateRootAccess(node: AST.RootAccess): string {
    const input = this.options.inputVar;
    if (node.path === null) {
      return input;
    }
    if (this.strict) {
      return `${input}.${node.path}`;
    }
    return `${input}?.${node.path}`;
  }

  protected generateParentAccess(node: AST.ParentAccess): string {
    const parent = this.options.parentVar;
    if (node.path === null) {
      return parent;
    }
    if (this.strict) {
      return `${parent}.${node.path}`;
    }
    return `${parent}?.${node.path}`;
  }

  protected generateCurrentAccess(node: AST.CurrentAccess): string {
    const input = this.options.inputVar;
    if (node.path === null) {
      return input;
    }
    if (this.strict) {
      return `${input}.${node.path}`;
    }
    return `${input}?.${node.path}`;
  }

  protected generateBindingAccess(node: AST.BindingAccess): string {
    const bindings = this.options.bindingsVar;
    if (this.strict) {
      return `${bindings}.${node.name}`;
    }
    return `${bindings}?.${node.name}`;
  }

  // ============================================================================
  // PIPE EXPRESSION
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
  // CALL EXPRESSION
  // ============================================================================

  protected generateCallExpression(node: AST.CallExpression): string {
    const args = node.arguments.map((a) => this.generateExpression(a));

    // Built-in helper function
    if (node.callee.type === 'Identifier') {
      const funcName = node.callee.name;
      return `__helpers.${funcName}(${args.join(', ')})`;
    }

    // SpreadAccess.method() pattern
    if (node.callee.type === 'MemberAccess' && node.callee.object.type === 'SpreadAccess') {
      const array = this.generateExpression(node.callee.object.object);
      const method = node.callee.property;

      // Handle sort/sortDesc/groupBy/keyBy with key argument
      const helperMethods = ['sort', 'sortDesc', 'groupBy', 'keyBy'];
      if (helperMethods.includes(method) && node.arguments.length === 1) {
        const arg = node.arguments[0];
        let keyPath: string | null = null;

        if (arg.type === 'StringLiteral') {
          keyPath = arg.value;
        } else {
          keyPath = this.tryExtractPropertyPath(arg);
        }

        if (keyPath !== null) {
          if (this.strict) {
            const path = this.buildPathFromNode(node.callee.object.object);
            return `__helpers.${method}(__helpers.strictArray(${array}, "${path}"), "${keyPath}")`;
          }
          return `__helpers.${method}(${array} ?? [], "${keyPath}")`;
        }
      }

      if (this.strict) {
        const path = this.buildPathFromNode(node.callee.object.object);
        return `__helpers.strictArray(${array}, "${path}").${method}(${args.join(', ')})`;
      }
      return `(${array} ?? []).${method}(${args.join(', ')})`;
    }

    const callee = this.generateExpression(node.callee);
    return `${callee}(${args.join(', ')})`;
  }

  // ============================================================================
  // PIPED CALL
  // ============================================================================

  protected tryGeneratePipedCall(node: AST.Expression, pipeValue: string): string | null {
    // Direct identifier: value | funcName
    if (node.type === 'Identifier') {
      const funcName = node.name;
      return `__helpers.${funcName}(${pipeValue})`;
    }

    // Direct call: value | funcName(args)
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const funcName = node.callee.name;

      // Handle sort/groupBy/keyBy with property path argument
      const helperMethods = ['sort', 'sortDesc', 'groupBy', 'keyBy'];
      if (helperMethods.includes(funcName) && node.arguments.length === 1) {
        const arg = node.arguments[0];
        let keyPath: string | null = null;

        if (arg.type === 'StringLiteral') {
          keyPath = arg.value;
        } else {
          keyPath = this.tryExtractPropertyPath(arg);
        }

        if (keyPath !== null && keyPath !== '') {
          return `__helpers.${funcName}(${pipeValue}, "${keyPath}")`;
        }
      }

      const args = node.arguments.map((a) => this.generateExpression(a));
      return `__helpers.${funcName}(${pipeValue}${args.length ? ', ' + args.join(', ') : ''})`;
    }

    // Index access wrapping a pipeable call
    if (node.type === 'IndexAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const index = this.generateExpression(node.index);
        const op = node.optional || !this.strict ? '?.' : '';
        return `${innerResult}${op}[${index}]`;
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

    return null;
  }

  // ============================================================================
  // TYPE ASSERTIONS
  // ============================================================================

  protected generateTypeAssertion(node: AST.TypeAssertion): string {
    const expr = this.generateExpression(node.expression);

    if (this.strict) {
      const typeCheck = this.generateTypeCheck(expr, node.typeAnnotation);
      return `(${typeCheck})`;
    }

    return expr;
  }

  protected generateTypeCheck(expr: string, type: AST.TypeAnnotation): string {
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

  protected generateNonNullAssertion(node: AST.NonNullAssertion): string {
    const expr = this.generateExpression(node.expression);

    if (this.strict) {
      return `__helpers.assertNonNull(${expr})`;
    }

    return expr;
  }

  // ============================================================================
  // CHILD GENERATOR FACTORY
  // ============================================================================

  protected createChildGenerator(inputVar: string): LibraryCodeGenerator {
    return new LibraryCodeGenerator({
      ...this.options,
      strict: this.strict,
      inputVar,
      wrapInFunction: false,
    });
  }
}
