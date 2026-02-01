/**
 * Native Code Generator - Generates pure JavaScript without any helper dependencies
 */

import * as AST from '../ast.js';
import { BaseCodeGenerator, CodeGenOptions } from './base.js';

export class NativeCodeGenerator extends BaseCodeGenerator {
  constructor(options: CodeGenOptions = {}) {
    super(options);
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

    return `${this.options.inputVar}?.${node.name}`;
  }

  // ============================================================================
  // MEMBER ACCESS
  // ============================================================================

  protected generateMemberAccess(node: AST.MemberAccess): string {
    // SpreadAccess + MemberAccess = map operation
    if (node.object.type === 'SpreadAccess') {
      const array = this.generateExpression(node.object.object);
      return `(${array} ?? []).map((item, index, arr) => item?.${node.property})`;
    }

    // FilterAccess + MemberAccess = filter then map
    if (node.object.type === 'FilterAccess') {
      const filterExpr = this.generateFilterAccess(node.object);
      return `(${filterExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    // SliceAccess + MemberAccess = slice then map
    if (node.object.type === 'SliceAccess') {
      const sliceExpr = this.generateSliceAccess(node.object);
      return `(${sliceExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    // Chained property after array-producing operation
    if (node.object.type === 'MemberAccess' && this.isArrayProducingMemberAccess(node.object)) {
      const arrayExpr = this.generateExpression(node.object);
      return `(${arrayExpr}).map((item, index, arr) => item?.${node.property})`;
    }

    const object = this.generateExpression(node.object);
    return `${object}?.${node.property}`;
  }

  // ============================================================================
  // INDEX ACCESS
  // ============================================================================

  protected generateIndexAccess(node: AST.IndexAccess): string {
    const object = this.generateExpression(node.object);
    const index = this.generateExpression(node.index);
    return `${object}?.[${index}]`;
  }

  // ============================================================================
  // SLICE ACCESS
  // ============================================================================

  protected generateSliceAccess(node: AST.SliceAccess): string {
    const object = this.generateExpression(node.object);
    const start = node.sliceStart ? this.generateExpression(node.sliceStart) : '0';
    const end = node.sliceEnd ? this.generateExpression(node.sliceEnd) : '';
    return `(${object} ?? []).slice(${start}${end ? ', ' + end : ''})`;
  }

  // ============================================================================
  // SPREAD ACCESS
  // ============================================================================

  protected generateSpreadAccess(node: AST.SpreadAccess): string {
    const object = this.generateExpression(node.object);
    return `(${object} ?? [])`;
  }

  // ============================================================================
  // FILTER ACCESS
  // ============================================================================

  protected generateFilterAccess(node: AST.FilterAccess): string {
    const object = this.generateExpression(node.object);
    const predicateCode = this.generatePredicateFunction(node.predicate);
    return `(${object} ?? []).filter(${predicateCode})`;
  }

  protected generatePredicateFunction(predicate: AST.Expression): string {
    const childGen = this.createChildGenerator('item');
    const body = childGen.generateExpressionPublic(predicate);
    return `(item, index, arr) => ${body}`;
  }

  // For child generators to access generateExpression
  public generateExpressionPublic(node: AST.Expression): string {
    return this.generateExpression(node);
  }

  // ============================================================================
  // MAP TRANSFORM
  // ============================================================================

  protected generateMapTransform(node: AST.MapTransform): string {
    const array = this.generateExpression(node.array);
    const childGen = this.createChildGenerator('item');
    const templateCode = childGen.generateObjectLiteralForMap(node.template);
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
    return `${input}?.${node.path}`;
  }

  protected generateParentAccess(node: AST.ParentAccess): string {
    const parent = this.options.parentVar;
    if (node.path === null) {
      return parent;
    }
    return `${parent}?.${node.path}`;
  }

  protected generateCurrentAccess(node: AST.CurrentAccess): string {
    const input = this.options.inputVar;
    if (node.path === null) {
      return input;
    }
    return `${input}?.${node.path}`;
  }

  protected generateBindingAccess(node: AST.BindingAccess): string {
    const bindings = this.options.bindingsVar;
    return `${bindings}?.${node.name}`;
  }

  // ============================================================================
  // PIPE EXPRESSION
  // ============================================================================

  protected generatePipeExpression(node: AST.PipeExpression): string {
    const left = this.generateExpression(node.left);

    // Object literal on right - pipe-to-object construction
    if (node.right.type === 'ObjectLiteral') {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      return `(((${tempVar}) => (${right}))(${left}))`;
    }

    // Array literal on right - pipe-to-array construction
    if (node.right.type === 'ArrayLiteral') {
      const tempVar = this.getTempVar('_pipe');
      const prevPipeVar = this.pipeContextVar;
      this.pipeContextVar = tempVar;
      const right = this.generateExpression(node.right);
      this.pipeContextVar = prevPipeVar;
      return `(((${tempVar}) => ${right})(${left}))`;
    }

    // PipeContextRef (jq-style property access)
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
      const nativeCode = this.generateNativeHelperCall(funcName, args);
      if (nativeCode) return nativeCode;
      // Fallback - shouldn't happen in native mode
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
  // PIPED CALL
  // ============================================================================

  protected tryGeneratePipedCall(node: AST.Expression, pipeValue: string): string | null {
    // Direct identifier: value | funcName
    if (node.type === 'Identifier') {
      const funcName = node.name;
      const nativeCode = this.generateNativeHelperCall(funcName, [pipeValue]);
      if (nativeCode) return nativeCode;
      return null;
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
          return this.generateNativeArrayMethod(pipeValue, funcName, keyPath);
        }
      }

      const args = node.arguments.map((a) => this.generateExpression(a));
      const nativeCode = this.generateNativeHelperCall(funcName, [pipeValue, ...args]);
      if (nativeCode) return nativeCode;
      return null;
    }

    // Index access wrapping a pipeable call
    if (node.type === 'IndexAccess') {
      const innerResult = this.tryGeneratePipedCall(node.object, pipeValue);
      if (innerResult) {
        const index = this.generateExpression(node.index);
        return `${innerResult}?.[${index}]`;
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
