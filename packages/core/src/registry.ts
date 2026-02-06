/**
 * Global Registry for Custom Helpers and External Libraries
 *
 * Provides global registration of custom helper functions and external libraries
 * that can be used in expressions. These are the lowest priority tier, below
 * instance-level and per-evaluation helpers.
 *
 * @example
 * ```ts
 * import { registerFunction, registerLibrary } from '@ahsankhanamu/json-transformer';
 *
 * // Register a custom helper function
 * registerFunction('formatCurrency', (value, currency = 'USD') => {
 *   return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
 * });
 *
 * // Register an external library
 * import _ from 'lodash';
 * registerLibrary('_', _);
 *
 * // Now use in expressions:
 * // value | formatCurrency('EUR')
 * // items | _.chunk(2)
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomHelperFunction = (...args: any[]) => any;

export interface LibraryObject {
  [key: string]: unknown;
}

// =============================================================================
// STORAGE
// =============================================================================

/** Global storage for custom helper functions */
const customHelpers = new Map<string, CustomHelperFunction>();

/** Global storage for external libraries */
const libraries = new Map<string, LibraryObject>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Register a custom helper function globally
 *
 * @param name - The function name to use in expressions
 * @param fn - The function implementation
 * @throws Error if name is invalid or fn is not a function
 *
 * @example
 * ```ts
 * registerFunction('double', (x) => x * 2);
 * // Use: value | double
 *
 * registerFunction('formatCurrency', (value, currency = 'USD') => {
 *   return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
 * });
 * // Use: price | formatCurrency('EUR')
 * ```
 */
export function registerFunction(name: string, fn: CustomHelperFunction): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Function name must be a non-empty string');
  }

  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    throw new Error(`Invalid function name: '${name}'. Must be a valid identifier.`);
  }

  if (typeof fn !== 'function') {
    throw new Error(`Expected a function for '${name}', got ${typeof fn}`);
  }

  customHelpers.set(name, fn);
}

/**
 * Unregister a custom helper function
 *
 * @param name - The function name to remove
 * @returns true if the function was removed, false if it didn't exist
 */
export function unregisterFunction(name: string): boolean {
  return customHelpers.delete(name);
}

/**
 * Get all registered custom helper functions
 *
 * @returns Record of function name to function
 */
export function getCustomHelpers(): Record<string, CustomHelperFunction> {
  const result: Record<string, CustomHelperFunction> = {};
  for (const [name, fn] of customHelpers) {
    result[name] = fn;
  }
  return result;
}

/**
 * Check if a custom helper function is registered
 *
 * @param name - The function name to check
 * @returns true if registered
 */
export function hasCustomHelper(name: string): boolean {
  return customHelpers.has(name);
}

// =============================================================================
// LIBRARY FUNCTIONS
// =============================================================================

/**
 * Register an external library globally
 *
 * Libraries are accessed via namespace in expressions, e.g., `_.chunk(arr, 2)`
 *
 * @param namespace - The namespace to use in expressions
 * @param library - The library object
 * @throws Error if namespace is invalid or library is not an object
 *
 * @example
 * ```ts
 * import _ from 'lodash';
 * registerLibrary('_', _);
 * // Use: items | _.chunk(2)
 *
 * import * as R from 'ramda';
 * registerLibrary('R', R);
 * // Use: items | R.filter(R.propEq('active', true))
 * ```
 */
export function registerLibrary(namespace: string, library: LibraryObject): void {
  if (!namespace || typeof namespace !== 'string') {
    throw new Error('Library namespace must be a non-empty string');
  }

  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(namespace)) {
    throw new Error(`Invalid namespace: '${namespace}'. Must be a valid identifier.`);
  }

  if (library === null || typeof library !== 'object') {
    throw new Error(`Expected an object for library '${namespace}', got ${typeof library}`);
  }

  libraries.set(namespace, library);
}

/**
 * Unregister an external library
 *
 * @param namespace - The library namespace to remove
 * @returns true if the library was removed, false if it didn't exist
 */
export function unregisterLibrary(namespace: string): boolean {
  return libraries.delete(namespace);
}

/**
 * Get all registered libraries
 *
 * @returns Record of namespace to library object
 */
export function getLibraries(): Record<string, LibraryObject> {
  const result: Record<string, LibraryObject> = {};
  for (const [namespace, lib] of libraries) {
    result[namespace] = lib;
  }
  return result;
}

/**
 * Check if a library namespace is registered
 *
 * @param namespace - The namespace to check
 * @returns true if registered
 */
export function hasLibrary(namespace: string): boolean {
  return libraries.has(namespace);
}

/**
 * Get a specific library by namespace
 *
 * @param namespace - The namespace to get
 * @returns The library object or undefined
 */
export function getLibrary(namespace: string): LibraryObject | undefined {
  return libraries.get(namespace);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear all registered custom helpers and libraries
 *
 * Useful for testing or resetting state.
 */
export function clearRegistry(): void {
  customHelpers.clear();
  libraries.clear();
}

/**
 * Get a combined helpers object with custom helpers and library namespaces
 *
 * This is used internally by the transformer to build the __helpers object
 * that is passed to the generated code.
 *
 * @param builtInHelpers - The built-in helpers object from runtime.ts
 * @returns Combined helpers object
 */
export function buildHelpersObject(
  builtInHelpers: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...builtInHelpers };

  // Add custom helpers (overwrites built-in if same name)
  for (const [name, fn] of customHelpers) {
    result[name] = fn;
  }

  // Add libraries as namespaced objects
  for (const [namespace, lib] of libraries) {
    result[namespace] = lib;
  }

  return result;
}

/**
 * Get the list of registered library namespaces
 *
 * @returns Array of namespace strings
 */
export function getLibraryNamespaces(): string[] {
  return Array.from(libraries.keys());
}

/**
 * Get the list of registered custom helper names
 *
 * @returns Array of helper function names
 */
export function getCustomHelperNames(): string[] {
  return Array.from(customHelpers.keys());
}
