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
  // HOOKS
  // ============================================================================

  protected contextAccessOp(): string {
    return this.strict ? '.' : '?.';
  }

  protected identifierFallback(input: string, name: string): string {
    if (this.strict) {
      return `__helpers.strictGet(${input}, "${name}", "")`;
    }
    return `${input}?.${name}`;
  }

  protected ensureArray(obj: string, path: string): string {
    if (this.strict) {
      return `__helpers.strictArray(${obj}, "${path}")`;
    }
    return `(${obj} ?? [])`;
  }

  protected filterArray(arr: string, pred: string, path: string): string {
    if (this.strict) {
      return `__helpers.strictFilter(${arr}, ${pred}, "${path}")`;
    }
    return `(${arr} ?? []).filter(${pred})`;
  }

  protected mapArray(arr: string, cb: string, path: string): string {
    if (this.strict) {
      return `__helpers.strictMap(${arr}, ${cb}, "${path}")`;
    }
    return `(${arr} ?? []).map(${cb})`;
  }

  protected safeIndex(obj: string, idx: string, path: string, optional: boolean): string {
    if (this.strict && !optional) {
      return `__helpers.strictIndex(${obj}, ${idx}, "${path}")`;
    }
    const op = optional || !this.strict ? '?.' : '';
    return `${obj}${op}[${idx}]`;
  }

  protected safeMemberAccess(obj: string, prop: string, path: string, optional: boolean): string {
    if (this.strict && !optional) {
      return `__helpers.strictGet(${obj}, "${prop}", "${path}")`;
    }
    const op = optional || !this.strict ? '?.' : '.';
    return `${obj}${op}${prop}`;
  }

  protected autoProjectionMapping(item: string, prop: string, path: string): string {
    if (this.strict) {
      return `__helpers.strictGet(${item}, "${prop}", "${path}")`;
    }
    return `${item}?.${prop}`;
  }

  protected pipedAccessOp(optional: boolean): string {
    return optional || !this.strict ? '?.' : '.';
  }

  protected pipedIdentifier(name: string, pipe: string): string {
    return `__helpers.${name}(${pipe})`;
  }

  protected pipedCall(name: string, pipe: string, node: AST.CallExpression): string | null {
    // Handle sort/groupBy/keyBy with property path argument
    const helperMethods = ['sort', 'sortDesc', 'groupBy', 'keyBy'];
    if (helperMethods.includes(name) && node.arguments.length === 1) {
      const arg = node.arguments[0];
      const keyPath = arg.type === 'StringLiteral' ? arg.value : this.tryExtractPropertyPath(arg);
      if (keyPath !== null && keyPath !== '') {
        return `__helpers.${name}(${pipe}, "${keyPath}")`;
      }
    }

    const args = node.arguments.map((a) => this.generateExpression(a));
    return `__helpers.${name}(${pipe}${args.length ? ', ' + args.join(', ') : ''})`;
  }

  // ============================================================================
  // CALL EXPRESSION
  // ============================================================================

  protected generateCallExpression(node: AST.CallExpression): string {
    const args = node.arguments.map((a) => this.generateExpression(a));

    // Built-in or custom helper function: func(args) => __helpers.func(args)
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
