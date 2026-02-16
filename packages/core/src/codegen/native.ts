/**
 * Native Code Generator - Generates pure JavaScript without any helper dependencies
 */

import * as AST from '../ast.js';
import { BaseCodeGenerator, CodeGenOptions } from './base.js';

/** Set of unknown helper names encountered during code generation */
export type UnknownHelperWarning = {
  name: string;
  type: 'helper' | 'library';
};

export class NativeCodeGenerator extends BaseCodeGenerator {
  /** Track unknown helpers for warnings */
  private unknownHelpers: UnknownHelperWarning[] = [];

  constructor(options: CodeGenOptions = {}) {
    super(options);
  }

  /**
   * Get warnings about unknown helpers encountered during code generation.
   * In native mode, these helpers must be in scope at runtime.
   */
  getWarnings(): UnknownHelperWarning[] {
    return [...this.unknownHelpers];
  }

  /**
   * Clear the warnings list
   */
  clearWarnings(): void {
    this.unknownHelpers = [];
  }

  /**
   * Record a warning for an unknown helper
   */
  private warnUnknownHelper(name: string, type: 'helper' | 'library'): void {
    // Avoid duplicates
    if (!this.unknownHelpers.some((w) => w.name === name && w.type === type)) {
      this.unknownHelpers.push({ name, type });
    }
  }

  // ============================================================================
  // HOOKS
  // ============================================================================

  protected contextAccessOp(): string {
    return '?.';
  }

  protected identifierFallback(input: string, name: string): string {
    return `${input}?.${name}`;
  }

  protected ensureArray(obj: string, _path: string): string {
    return `(${obj} ?? [])`;
  }

  protected filterArray(arr: string, pred: string, _path: string): string {
    return `(${arr} ?? []).filter(${pred})`;
  }

  protected mapArray(arr: string, cb: string, _path: string): string {
    return `(${arr} ?? []).map(${cb})`;
  }

  protected safeIndex(obj: string, idx: string, _path: string, _optional: boolean): string {
    return `${obj}?.[${idx}]`;
  }

  protected safeMemberAccess(obj: string, prop: string, _path: string, _optional: boolean): string {
    return `${obj}?.${prop}`;
  }

  protected autoProjectionMapping(item: string, prop: string, _path: string): string {
    return `${item}?.${prop}`;
  }

  protected pipedAccessOp(_optional: boolean): string {
    return '?.';
  }

  protected pipedIdentifier(name: string, pipe: string): string {
    const nativeCode = this.generateNativeHelperCall(name, [pipe]);
    if (nativeCode) return nativeCode;
    this.warnUnknownHelper(name, 'helper');
    return `${name}(${pipe})`;
  }

  protected pipedCall(name: string, pipe: string, node: AST.CallExpression): string | null {
    // Handle sort/groupBy/keyBy with property path argument
    const helperMethods = ['sort', 'sortDesc', 'groupBy', 'keyBy'];
    if (helperMethods.includes(name) && node.arguments.length === 1) {
      const arg = node.arguments[0];
      const keyPath = arg.type === 'StringLiteral' ? arg.value : this.tryExtractPropertyPath(arg);
      if (keyPath !== null && keyPath !== '') {
        return this.generateNativeArrayMethod(pipe, name, keyPath);
      }
    }

    const args = node.arguments.map((a) => this.generateExpression(a));
    return this.generateNativeHelperCall(name, [pipe, ...args]);
  }

  // ============================================================================
  // CALL EXPRESSION
  // ============================================================================

  protected generateCallExpression(node: AST.CallExpression): string {
    const args = node.arguments.map((a) => this.generateExpression(a));

    // Built-in helper function or custom helper
    if (node.callee.type === 'Identifier') {
      const funcName = node.callee.name;
      const nativeCode = this.generateNativeHelperCall(funcName, args);
      if (nativeCode) return nativeCode;
      // Custom helper - warn that it must be in scope at runtime
      this.warnUnknownHelper(funcName, 'helper');
      return `${funcName}(${args.join(', ')})`;
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
          return this.generateNativeArrayMethod(array, method, keyPath);
        }
      }

      return `(${array} ?? []).${method}(${args.join(', ')})`;
    }

    const callee = this.generateExpression(node.callee);
    return `${callee}(${args.join(', ')})`;
  }

  // ============================================================================
  // TYPE ASSERTIONS (no-op in native mode)
  // ============================================================================

  protected generateTypeAssertion(node: AST.TypeAssertion): string {
    return this.generateExpression(node.expression);
  }

  protected generateNonNullAssertion(node: AST.NonNullAssertion): string {
    return this.generateExpression(node.expression);
  }

  // ============================================================================
  // NATIVE HELPER IMPLEMENTATIONS
  // ============================================================================

  protected generateNativeHelperCall(funcName: string, args: string[]): string | null {
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

    // Array functions with callbacks
    if (funcName === 'map') return `${args[0]}?.map(${args[1]})`;
    if (funcName === 'filter') return `${args[0]}?.filter(${args[1]})`;
    if (funcName === 'find') return `${args[0]}?.find(${args[1]})`;
    if (funcName === 'some') return `${args[0]}?.some(${args[1]})`;
    if (funcName === 'every') return `${args[0]}?.every(${args[1]})`;
    if (funcName === 'reduce')
      return `(${args[0]} ?? []).reduce(${args[1]}, ${args[2] ?? 'undefined'})`;

    // Array functions - simple
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

  protected generateNativeArrayMethod(array: string, method: string, keyPath: string): string {
    const pathParts = keyPath.split('.');
    const getProp = (varName: string) =>
      pathParts.length === 1 ? `${varName}.${keyPath}` : `${varName}.${pathParts.join('.')}`;

    const safeArray = array.includes('?? []') ? array : `(${array} ?? [])`;

    if (method === 'sort') {
      return `${safeArray}.toSorted((a, b) => ${getProp('a')} - ${getProp('b')})`;
    }

    if (method === 'sortDesc') {
      return `${safeArray}.toSorted((a, b) => ${getProp('b')} - ${getProp('a')})`;
    }

    if (method === 'groupBy') {
      return `${safeArray}.reduce((acc, item) => { const key = String(${getProp('item')}); (acc[key] = acc[key] || []).push(item); return acc; }, {})`;
    }

    if (method === 'keyBy') {
      return `${safeArray}.reduce((acc, item) => { acc[String(${getProp('item')})] = item; return acc; }, {})`;
    }

    return `${safeArray}.${method}("${keyPath}")`;
  }

  // ============================================================================
  // CHILD GENERATOR FACTORY
  // ============================================================================

  protected createChildGenerator(inputVar: string): NativeCodeGenerator {
    return new NativeCodeGenerator({
      ...this.options,
      inputVar,
      wrapInFunction: false,
    });
  }
}
