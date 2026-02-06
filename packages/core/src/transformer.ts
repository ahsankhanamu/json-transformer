/**
 * Transformer Factory - Creates configured transformer instances
 *
 * Provides a factory function for creating transformer instances with
 * pre-configured helpers and libraries. Supports 3-tier extensibility:
 *
 * 1. Global (lowest priority) - via registerFunction/registerLibrary
 * 2. Instance (medium priority) - via createTransformer config
 * 3. Per-evaluation (highest priority) - via evaluate options
 *
 * @example
 * ```ts
 * import { createTransformer } from '@ahsankhanamu/json-transformer';
 *
 * // Create a configured transformer
 * const transformer = createTransformer({
 *   helpers: {
 *     formatCurrency: (value, currency = 'USD') => {
 *       return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
 *     },
 *   },
 *   libraries: {
 *     utils: { double: x => x * 2 },
 *   },
 * });
 *
 * // Use the transformer
 * const result = transformer.evaluate(data, 'price | formatCurrency("EUR")');
 * const code = transformer.toJS('items | utils.double');
 * const fn = transformer.compile('value | upper');
 * ```
 */

import { parse } from './parser.js';
import { generate, FullCodeGenOptions } from './codegen.js';
import { helpers as builtInHelpers } from './runtime.js';
import { getCustomHelpers, getLibraries, CustomHelperFunction, LibraryObject } from './registry.js';

// =============================================================================
// TYPES
// =============================================================================

export interface TransformerConfig {
  /** Custom helper functions for this instance */
  helpers?: Record<string, CustomHelperFunction>;

  /** External libraries for this instance */
  libraries?: Record<string, LibraryObject>;

  /** Enable strict mode by default */
  strict?: boolean;
}

export interface TransformerCompileOptions extends FullCodeGenOptions {
  /** Cache compiled functions */
  cache?: boolean;
}

export interface TransformerEvaluateOptions {
  /** Use strict mode */
  strict?: boolean;

  /** External bindings/context */
  bindings?: Record<string, unknown>;

  /** Per-evaluation custom helpers (highest priority) */
  helpers?: Record<string, CustomHelperFunction>;
}

/** Compiled transform function */
export type TransformFunction = (input: unknown, bindings?: Record<string, unknown>) => unknown;

export interface Transformer {
  /**
   * Compile an expression to a reusable function
   *
   * @param expression - The expression to compile
   * @param options - Compile options
   * @returns A reusable transform function
   */
  compile(expression: string, options?: TransformerCompileOptions): TransformFunction;

  /**
   * Evaluate an expression directly (data first)
   *
   * @param input - The input data
   * @param expression - The expression to evaluate
   * @param options - Evaluation options (can include per-evaluation helpers)
   * @returns The evaluation result
   */
  evaluate(input: unknown, expression: string, options?: TransformerEvaluateOptions): unknown;

  /**
   * Generate JavaScript code from an expression
   *
   * @param expression - The expression to convert
   * @param options - Code generation options
   * @returns Generated JavaScript code
   */
  toJS(expression: string, options?: FullCodeGenOptions): string;

  /**
   * Get the merged helpers object for this instance
   *
   * @returns The helpers object with all tiers merged
   */
  getHelpers(): Record<string, unknown>;

  /**
   * Clear the instance cache
   */
  clearCache(): void;
}

// =============================================================================
// HELPER MERGING
// =============================================================================

/**
 * Build the merged helpers object with proper priority
 *
 * Priority (highest to lowest):
 * 1. Per-evaluation helpers
 * 2. Instance helpers
 * 3. Global registry helpers
 * 4. Built-in helpers
 *
 * @param instanceHelpers - Helpers from transformer config
 * @param instanceLibraries - Libraries from transformer config
 * @param evalHelpers - Per-evaluation helpers (optional)
 */
function buildHelpers(
  instanceHelpers: Record<string, CustomHelperFunction> = {},
  instanceLibraries: Record<string, LibraryObject> = {},
  evalHelpers: Record<string, CustomHelperFunction> = {}
): Record<string, unknown> {
  // Start with built-in helpers (lowest priority)
  const result: Record<string, unknown> = { ...builtInHelpers };

  // Add global registry custom helpers
  const globalHelpers = getCustomHelpers();
  for (const [name, fn] of Object.entries(globalHelpers)) {
    result[name] = fn;
  }

  // Add global registry libraries
  const globalLibraries = getLibraries();
  for (const [namespace, lib] of Object.entries(globalLibraries)) {
    result[namespace] = lib;
  }

  // Add instance-level helpers (medium priority)
  for (const [name, fn] of Object.entries(instanceHelpers)) {
    result[name] = fn;
  }

  // Add instance-level libraries
  for (const [namespace, lib] of Object.entries(instanceLibraries)) {
    result[namespace] = lib;
  }

  // Add per-evaluation helpers (highest priority)
  for (const [name, fn] of Object.entries(evalHelpers)) {
    result[name] = fn;
  }

  return result;
}

// =============================================================================
// TRANSFORMER FACTORY
// =============================================================================

/**
 * Create a configured transformer instance
 *
 * The returned transformer has its own cache and helper configuration.
 * Helpers are merged with the following priority (highest to lowest):
 * 1. Per-evaluation helpers (passed to evaluate())
 * 2. Instance helpers (passed to createTransformer())
 * 3. Global registry helpers (via registerFunction/registerLibrary)
 * 4. Built-in helpers
 *
 * @param config - Transformer configuration
 * @returns A transformer instance
 *
 * @example
 * ```ts
 * const transformer = createTransformer({
 *   helpers: {
 *     greet: (name) => `Hello, ${name}!`,
 *   },
 *   libraries: {
 *     utils: { double: x => x * 2 },
 *   },
 * });
 *
 * transformer.evaluate({ name: 'World' }, 'name | greet');
 * // => 'Hello, World!'
 *
 * transformer.evaluate({ value: 5 }, 'value | utils.double');
 * // => 10
 *
 * // Override with per-evaluation helper
 * transformer.evaluate({ name: 'World' }, 'name | greet', {
 *   helpers: { greet: (name) => `Hi, ${name}!` }
 * });
 * // => 'Hi, World!'
 * ```
 */
export function createTransformer(config: TransformerConfig = {}): Transformer {
  const {
    helpers: instanceHelpers = {},
    libraries: instanceLibraries = {},
    strict: defaultStrict = false,
  } = config;

  // Instance-level cache (separate from global cache)
  const instanceCache = new Map<string, TransformFunction>();

  /**
   * Get base helpers (without per-evaluation overrides)
   */
  function getBaseHelpers(): Record<string, unknown> {
    return buildHelpers(instanceHelpers, instanceLibraries);
  }

  /**
   * Compile an expression to a reusable function
   */
  function compile(expression: string, options: TransformerCompileOptions = {}): TransformFunction {
    const strict = options.strict ?? defaultStrict;
    const cacheKey = strict ? `strict:${expression}` : expression;

    // Check cache
    if (options.cache !== false && instanceCache.has(cacheKey)) {
      return instanceCache.get(cacheKey)!;
    }

    // Parse the expression
    const ast = parse(expression);

    // Generate JavaScript code
    const code = generate(ast, {
      strict,
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

    // Get base helpers (will be extended at evaluation time if needed)
    const baseHelpers = getBaseHelpers();

    // Wrap with helpers
    const transform: TransformFunction = (input, bindings = {}) => {
      return fn(input, bindings, baseHelpers);
    };

    // Cache it
    if (options.cache !== false) {
      instanceCache.set(cacheKey, transform);
    }

    return transform;
  }

  /**
   * Evaluate an expression directly
   */
  function evaluate(
    input: unknown,
    expression: string,
    options: TransformerEvaluateOptions = {}
  ): unknown {
    const strict = options.strict ?? defaultStrict;
    const { bindings = {}, helpers: evalHelpers } = options;

    // If per-evaluation helpers are provided, we need a fresh function
    // (can't use cached version as helpers are different)
    if (evalHelpers && Object.keys(evalHelpers).length > 0) {
      const ast = parse(expression);
      const code = generate(ast, {
        strict,
        wrapInFunction: false,
        inputVar: 'input',
        bindingsVar: 'bindings',
      });

      const fn = new Function('input', 'bindings', '__helpers', `"use strict";\n${code}`) as (
        input: unknown,
        bindings: Record<string, unknown>,
        h: Record<string, unknown>
      ) => unknown;

      // Build helpers with per-evaluation overrides
      const mergedHelpers = buildHelpers(instanceHelpers, instanceLibraries, evalHelpers);
      return fn(input, bindings, mergedHelpers);
    }

    // Use cached compile path
    const fn = compile(expression, { strict, cache: true });
    return fn(input, bindings);
  }

  /**
   * Generate JavaScript code from an expression
   */
  function toJS(expression: string, options: FullCodeGenOptions = {}): string {
    const ast = parse(expression);
    return generate(ast, options);
  }

  /**
   * Get merged helpers for this instance
   */
  function getHelpers(): Record<string, unknown> {
    return getBaseHelpers();
  }

  /**
   * Clear the instance cache
   */
  function clearCache(): void {
    instanceCache.clear();
  }

  return {
    compile,
    evaluate,
    toJS,
    getHelpers,
    clearCache,
  };
}
