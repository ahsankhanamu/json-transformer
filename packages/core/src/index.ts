/**
 * JSON Transformer - Expression Language for JSON Data
 *
 * A simple, intuitive expression language for JSON data that compiles to JavaScript.
 * Supports both strict (validation) and forgiving (production) modes.
 *
 * @example
 * ```ts
 * import { compile, evaluate, toJS } from '@anthropic/json-transformer';
 *
 * // Compile an expression
 * const fn = compile('user.name | upper');
 * const result = fn({ user: { name: 'john' } });
 * // result: 'JOHN'
 *
 * // Or evaluate directly (data first)
 * const result = evaluate({ price: 10, quantity: 5 }, 'price * quantity');
 * // result: 50
 *
 * // Generate JavaScript code
 * const code = toJS('user.name | upper');
 * ```
 */

import { parse } from './parser.js';
import { generate, CodeGenOptions } from './codegen.js';
import { helpers } from './runtime.js';
import * as AST from './ast.js';

// Re-export types
export type { Token } from './tokens.js';
export { TokenType } from './tokens.js';
export { Lexer, tokenize, LexerError } from './lexer.js';
export { Parser, parse, ParseError } from './parser.js';
export { CodeGenerator, generate } from './codegen.js';
export type { CodeGenOptions } from './codegen.js';
export { helpers, TransformError } from './runtime.js';
export * as AST from './ast.js';

// =============================================================================
// MAIN API
// =============================================================================

export interface CompileOptions extends CodeGenOptions {
  /** Cache compiled functions */
  cache?: boolean;
}

export interface EvaluateOptions {
  /** Use strict mode */
  strict?: boolean;
  /** External bindings/context */
  bindings?: Record<string, unknown>;
}

/** Compiled transform function */
export type TransformFunction = (input: unknown, bindings?: Record<string, unknown>) => unknown;

// Simple expression cache
const expressionCache = new Map<string, TransformFunction>();

/**
 * Compile an expression to a reusable function
 *
 * @example
 * ```ts
 * const transform = compile('orders[*].{ id, total: price * qty }');
 * const result = transform(data);
 * ```
 */
export function compile(expression: string, options: CompileOptions = {}): TransformFunction {
  const cacheKey = options.strict ? `strict:${expression}` : expression;

  // Check cache
  if (options.cache !== false && expressionCache.has(cacheKey)) {
    return expressionCache.get(cacheKey)!;
  }

  // Parse the expression
  const ast = parse(expression);

  // Generate JavaScript code
  const code = generate(ast, {
    strict: options.strict ?? false,
    wrapInFunction: false,
    inputVar: 'input',
    bindingsVar: 'bindings',
  });

  // Create the function
  const fn = new Function('input', 'bindings', '__helpers', `"use strict";\n${code}`) as (
    input: unknown,
    bindings: Record<string, unknown>,
    h: Record<string, Function>
  ) => unknown;

  // Wrap with helpers
  const transform: TransformFunction = (input, bindings = {}) => {
    return fn(input, bindings, helpers);
  };

  // Cache it
  if (options.cache !== false) {
    expressionCache.set(cacheKey, transform);
  }

  return transform;
}

/**
 * Evaluate an expression directly (data first)
 *
 * @example
 * ```ts
 * const result = evaluate(
 *   { firstName: 'John', lastName: 'Doe' },
 *   'firstName & " " & lastName'
 * );
 * // result: 'John Doe'
 * ```
 */
export function evaluate(
  input: unknown,
  expression: string,
  options: EvaluateOptions = {}
): unknown {
  const fn = compile(expression, { strict: options.strict, cache: true });
  return fn(input, options.bindings);
}

/**
 * Parse an expression and return the AST
 *
 * @example
 * ```ts
 * const ast = parseExpression('user.name | upper');
 * console.log(JSON.stringify(ast, null, 2));
 * ```
 */
export function parseExpression(expression: string): AST.Program {
  return parse(expression);
}

/**
 * Generate JavaScript code from an expression
 *
 * @example
 * ```ts
 * const code = toJS('price * quantity');
 * console.log(code);
 * // function transform(input, bindings = {}) {
 * //   return input?.price * input?.quantity;
 * // }
 *
 * // Native JS (no helpers)
 * const native = toJS('orders | sort(.price)', { native: true });
 * ```
 */
export function toJS(expression: string, options: CodeGenOptions = {}): string {
  const ast = parse(expression);
  return generate(ast, options);
}

/** @deprecated Use toJS instead */
export const toJavaScript = toJS;

/**
 * Validate an expression without executing it
 *
 * @returns null if valid, or an Error with details
 */
export function validate(expression: string): Error | null {
  try {
    parse(expression);
    return null;
  } catch (error) {
    return error as Error;
  }
}

/**
 * Clear the expression cache
 */
export function clearCache(): void {
  expressionCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: expressionCache.size,
    keys: Array.from(expressionCache.keys()),
  };
}

// =============================================================================
// TEMPLATE LITERAL TAG
// =============================================================================

/**
 * Template literal tag for expressions
 *
 * @example
 * ```ts
 * const transform = jt`orders[*].{ id, total: price * qty }`;
 * const result = transform(data);
 * ```
 */
export function jt(strings: TemplateStringsArray, ...values: unknown[]): TransformFunction {
  // Combine template literal parts
  let expression = strings[0];
  for (let i = 0; i < values.length; i++) {
    expression += String(values[i]) + strings[i + 1];
  }
  return compile(expression);
}

// =============================================================================
// BUILDER API (for programmatic AST construction)
// =============================================================================

export const builder = {
  number: (value: number): AST.NumberLiteral => ({ type: 'NumberLiteral', value }),
  string: (value: string): AST.StringLiteral => ({ type: 'StringLiteral', value }),
  boolean: (value: boolean): AST.BooleanLiteral => ({ type: 'BooleanLiteral', value }),
  null: (): AST.NullLiteral => ({ type: 'NullLiteral' }),
  identifier: (name: string): AST.Identifier => ({ type: 'Identifier', name }),

  member: (object: AST.Expression, property: string, optional = false): AST.MemberAccess => ({
    type: 'MemberAccess',
    object,
    property,
    optional,
  }),

  index: (object: AST.Expression, index: AST.Expression, optional = false): AST.IndexAccess => ({
    type: 'IndexAccess',
    object,
    index,
    optional,
  }),

  binary: (
    operator: string,
    left: AST.Expression,
    right: AST.Expression
  ): AST.BinaryExpression => ({
    type: 'BinaryExpression',
    operator,
    left,
    right,
  }),

  call: (callee: AST.Expression, args: AST.Expression[]): AST.CallExpression => ({
    type: 'CallExpression',
    callee,
    arguments: args,
  }),

  object: (properties: AST.ObjectProperty[]): AST.ObjectLiteral => ({
    type: 'ObjectLiteral',
    properties,
  }),

  array: (elements: AST.Expression[]): AST.ArrayLiteral => ({
    type: 'ArrayLiteral',
    elements,
  }),

  program: (expression: AST.Expression, statements: AST.LetBinding[] = []): AST.Program => ({
    type: 'Program',
    statements,
    expression,
  }),
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  compile,
  evaluate,
  parse: parseExpression,
  toJS,
  toJavaScript, // deprecated alias
  validate,
  clearCache,
  getCacheStats,
  jt,
  builder,
  helpers,
};
