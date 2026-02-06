/**
 * JSON Transformer - Expression Language for JSON Data
 *
 * A simple, intuitive expression language for JSON data that compiles to JavaScript.
 * Supports both strict (validation) and forgiving (production) modes.
 *
 * @example
 * ```ts
 * import { compile, evaluate, toJS } from '@ahsankhanamu/json-transformer';
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
 *
 * // Custom helpers (3-tier extensibility)
 * registerFunction('double', (x) => x * 2);
 * evaluate({ value: 5 }, 'value | double'); // => 10
 *
 * // Configured instance
 * const transformer = createTransformer({
 *   helpers: { triple: x => x * 3 },
 * });
 * transformer.evaluate({ value: 5 }, 'value | triple'); // => 15
 * ```
 */

import { parse } from './parser.js';
import { generate, FullCodeGenOptions } from './codegen.js';
import { helpers as builtInHelpers } from './runtime.js';
import { buildHelpersObject, CustomHelperFunction } from './registry.js';
import * as AST from './ast.js';

// Re-export types
export type { Token } from './tokens.js';
export { TokenType } from './tokens.js';
export { Lexer, tokenize, LexerError } from './lexer.js';
export { Parser, parse, ParseError } from './parser.js';
export { CodeGenerator, generate } from './codegen.js';
export type { CodeGenOptions, FullCodeGenOptions } from './codegen.js';
export { helpers, TransformError } from './runtime.js';
export * as AST from './ast.js';

// Re-export registry functions
export {
  registerFunction,
  unregisterFunction,
  getCustomHelpers,
  hasCustomHelper,
  registerLibrary,
  unregisterLibrary,
  getLibraries,
  hasLibrary,
  getLibrary,
  clearRegistry,
  getLibraryNamespaces,
  getCustomHelperNames,
} from './registry.js';
export type { CustomHelperFunction, LibraryObject } from './registry.js';

// Re-export transformer factory
export { createTransformer } from './transformer.js';
export type {
  Transformer,
  TransformerConfig,
  TransformerCompileOptions,
  TransformerEvaluateOptions,
} from './transformer.js';

// =============================================================================
// MAIN API
// =============================================================================

export interface CompileOptions extends FullCodeGenOptions {
  /** Cache compiled functions */
  cache?: boolean;
}

export interface EvaluateOptions {
  /** Use strict mode */
  strict?: boolean;
  /** External bindings/context */
  bindings?: Record<string, unknown>;
  /** Per-evaluation custom helpers (highest priority) */
  helpers?: Record<string, CustomHelperFunction>;
}

/** Compiled transform function */
export type TransformFunction = (input: unknown, bindings?: Record<string, unknown>) => unknown;

// Simple expression cache
const expressionCache = new Map<string, TransformFunction>();

/**
 * Build merged helpers with global registry
 *
 * @returns Helpers object with built-in + global registry helpers/libraries
 */
function getMergedHelpers(): Record<string, unknown> {
  return buildHelpersObject(builtInHelpers);
}

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
    h: Record<string, unknown>
  ) => unknown;

  // Get merged helpers (built-in + global registry)
  const mergedHelpers = getMergedHelpers();

  // Wrap with helpers
  const transform: TransformFunction = (input, bindings = {}) => {
    return fn(input, bindings, mergedHelpers);
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
 * Supports per-evaluation helpers via options.helpers which take
 * highest priority over global registry and built-in helpers.
 *
 * @example
 * ```ts
 * const result = evaluate(
 *   { firstName: 'John', lastName: 'Doe' },
 *   'firstName & " " & lastName'
 * );
 * // result: 'John Doe'
 *
 * // With per-evaluation helper
 * const result = evaluate(
 *   { value: 5 },
 *   'value | double',
 *   { helpers: { double: x => x * 2 } }
 * );
 * // result: 10
 * ```
 */
export function evaluate(
  input: unknown,
  expression: string,
  options: EvaluateOptions = {}
): unknown {
  const { bindings = {}, helpers: evalHelpers, strict } = options;

  // If per-evaluation helpers are provided, we need a fresh execution
  // (can't use cached version as helpers are different)
  if (evalHelpers && Object.keys(evalHelpers).length > 0) {
    const ast = parse(expression);
    const code = generate(ast, {
      strict: strict ?? false,
      wrapInFunction: false,
      inputVar: 'input',
      bindingsVar: 'bindings',
    });

    const fn = new Function('input', 'bindings', '__helpers', `"use strict";\n${code}`) as (
      input: unknown,
      bindings: Record<string, unknown>,
      h: Record<string, unknown>
    ) => unknown;

    // Build helpers with per-evaluation overrides (highest priority)
    const mergedHelpers = getMergedHelpers();
    for (const [name, helperFn] of Object.entries(evalHelpers)) {
      mergedHelpers[name] = helperFn;
    }

    return fn(input, bindings, mergedHelpers);
  }

  // Use cached compile path
  const fn = compile(expression, { strict, cache: true });
  return fn(input, bindings);
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
export function toJS(expression: string, options: FullCodeGenOptions = {}): string {
  const ast = parse(expression);
  return generate(ast, options);
}

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
