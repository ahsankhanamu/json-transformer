/**
 * JSON Transformer Runtime Helpers
 * These functions are available during expression evaluation
 */

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface TransformErrorDetails {
  code: string;
  path?: string;
  expected?: string;
  actual?: string;
  suggestions?: string[];
  value?: unknown;
}

export class TransformError extends Error {
  public code: string;
  public path?: string;
  public expected?: string;
  public actual?: string;
  public suggestions?: string[];
  public value?: unknown;

  constructor(message: string, details: TransformErrorDetails | string = 'TRANSFORM_ERROR') {
    super(message);
    this.name = 'TransformError';

    if (typeof details === 'string') {
      this.code = details;
    } else {
      this.code = details.code;
      this.path = details.path;
      this.expected = details.expected;
      this.actual = details.actual;
      this.suggestions = details.suggestions;
      this.value = details.value;
    }
  }

  toString(): string {
    let msg = `TransformError: ${this.message}`;
    if (this.path) msg += `\n  Path: ${this.path}`;
    if (this.suggestions?.length) {
      msg += `\n  Did you mean: ${this.suggestions.join(', ')}?`;
    }
    return msg;
  }
}

// =============================================================================
// STRICT MODE HELPERS
// =============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar keys in an object (for "did you mean?" suggestions)
 */
function findSimilarKeys(target: string, keys: string[], maxDistance: number = 3): string[] {
  return keys
    .map((key) => ({ key, distance: levenshteinDistance(target.toLowerCase(), key.toLowerCase()) }))
    .filter(({ distance }) => distance <= maxDistance && distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ key }) => key);
}

/**
 * Get a readable type name
 */
function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Strict mode: Access a property with validation
 */
export function strictGet(obj: unknown, property: string, path: string): unknown {
  // Check if object is null/undefined
  if (obj === null) {
    throw new TransformError(`Cannot access property '${property}' of null`, {
      code: 'NULL_ACCESS',
      path,
      actual: 'null',
    });
  }

  if (obj === undefined) {
    throw new TransformError(`Cannot access property '${property}' of undefined`, {
      code: 'UNDEFINED_ACCESS',
      path,
      actual: 'undefined',
    });
  }

  // Check if object is actually an object
  if (typeof obj !== 'object') {
    throw new TransformError(`Cannot access property '${property}' of ${getTypeName(obj)}`, {
      code: 'INVALID_ACCESS',
      path,
      expected: 'object',
      actual: getTypeName(obj),
    });
  }

  const record = obj as Record<string, unknown>;

  // Check if property exists
  if (!(property in record)) {
    const availableKeys = Object.keys(record);
    const suggestions = findSimilarKeys(property, availableKeys);

    let message = `Property '${property}' does not exist`;
    if (path) message += ` at path '${path}'`;

    throw new TransformError(message, {
      code: 'MISSING_PROPERTY',
      path: path ? `${path}.${property}` : property,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    });
  }

  return record[property];
}

/**
 * Strict mode: Access an array index with validation
 */
export function strictIndex(arr: unknown, index: number, path: string): unknown {
  if (arr === null || arr === undefined) {
    throw new TransformError(`Cannot access index [${index}] of ${getTypeName(arr)}`, {
      code: 'NULL_INDEX',
      path,
      actual: getTypeName(arr),
    });
  }

  if (!Array.isArray(arr)) {
    throw new TransformError(`Cannot access index [${index}] - value is not an array`, {
      code: 'NOT_ARRAY',
      path,
      expected: 'array',
      actual: getTypeName(arr),
    });
  }

  // Handle negative indices
  const actualIndex = index < 0 ? arr.length + index : index;

  if (actualIndex < 0 || actualIndex >= arr.length) {
    throw new TransformError(
      `Array index ${index} is out of bounds (array length: ${arr.length})`,
      {
        code: 'INDEX_OUT_OF_BOUNDS',
        path: `${path}[${index}]`,
        value: arr.length,
      }
    );
  }

  return arr[actualIndex];
}

/**
 * Strict mode: Ensure value is an array
 */
export function strictArray(value: unknown, path: string): unknown[] {
  if (value === null || value === undefined) {
    throw new TransformError(`Expected array but got ${getTypeName(value)}`, {
      code: 'NULL_ARRAY',
      path,
      expected: 'array',
      actual: getTypeName(value),
    });
  }

  if (!Array.isArray(value)) {
    throw new TransformError(`Expected array but got ${getTypeName(value)}`, {
      code: 'NOT_ARRAY',
      path,
      expected: 'array',
      actual: getTypeName(value),
    });
  }

  return value;
}

/**
 * Strict mode: Validate a value is not null/undefined
 */
export function strictNonNull<T>(value: T, path: string, message?: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new TransformError(message ?? `Value at '${path}' is ${getTypeName(value)}`, {
      code: 'NULL_VALUE',
      path,
      actual: getTypeName(value),
    });
  }
  return value as NonNullable<T>;
}

/**
 * Strict mode: Validate type
 */
export function strictType(value: unknown, expectedType: string, path: string): unknown {
  const actualType = getTypeName(value);

  if (expectedType === 'any') return value;

  if (actualType !== expectedType) {
    throw new TransformError(
      `Type mismatch at '${path}': expected ${expectedType}, got ${actualType}`,
      { code: 'TYPE_MISMATCH', path, expected: expectedType, actual: actualType }
    );
  }

  return value;
}

/**
 * Strict mode: Safe filter with validation
 */
export function strictFilter(
  arr: unknown,
  predicate: (item: unknown) => boolean,
  path: string
): unknown[] {
  const validArray = strictArray(arr, path);
  return validArray.filter(predicate);
}

/**
 * Strict mode: Safe map with validation
 */
export function strictMap<T>(
  arr: unknown,
  mapper: (item: unknown, index: number) => T,
  path: string
): T[] {
  const validArray = strictArray(arr, path);
  return validArray.map(mapper);
}

// =============================================================================
// STRING FUNCTIONS
// =============================================================================

export function upper(s: unknown): string {
  if (s == null) return '';
  return String(s).toUpperCase();
}

export function lower(s: unknown): string {
  if (s == null) return '';
  return String(s).toLowerCase();
}

export function trim(s: unknown): string {
  if (s == null) return '';
  return String(s).trim();
}

export function split(s: unknown, delimiter: string = ','): string[] {
  if (s == null) return [];
  return String(s).split(delimiter);
}

export function join(arr: unknown[], delimiter: string = ','): string {
  if (!Array.isArray(arr)) return '';
  return arr.join(delimiter);
}

export function substring(s: unknown, start: number, end?: number): string {
  if (s == null) return '';
  return String(s).substring(start, end);
}

export function replace(s: unknown, search: string | RegExp, replacement: string): string {
  if (s == null) return '';
  return String(s).replace(search, replacement);
}

export function replaceAll(s: unknown, search: string, replacement: string): string {
  if (s == null) return '';
  return String(s).replaceAll(search, replacement);
}

export function matches(s: unknown, pattern: string): boolean {
  if (s == null) return false;
  return new RegExp(pattern).test(String(s));
}

export function startsWith(s: unknown, prefix: string): boolean {
  if (s == null) return false;
  return String(s).startsWith(prefix);
}

export function endsWith(s: unknown, suffix: string): boolean {
  if (s == null) return false;
  return String(s).endsWith(suffix);
}

export function contains(s: unknown, search: string): boolean {
  if (s == null) return false;
  return String(s).includes(search);
}

export function padStart(s: unknown, length: number, char: string = ' '): string {
  if (s == null) return '';
  return String(s).padStart(length, char);
}

export function padEnd(s: unknown, length: number, char: string = ' '): string {
  if (s == null) return '';
  return String(s).padEnd(length, char);
}

export function capitalize(s: unknown): string {
  if (s == null) return '';
  const str = String(s);
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function camelCase(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

export function snakeCase(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
}

export function kebabCase(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
    .replace(/^-/, '');
}

// =============================================================================
// NUMBER FUNCTIONS
// =============================================================================

export function round(n: unknown, decimals: number = 0): number {
  if (n == null) return 0;
  const num = Number(n);
  if (isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export function floor(n: unknown): number {
  if (n == null) return 0;
  const num = Number(n);
  return isNaN(num) ? 0 : Math.floor(num);
}

export function ceil(n: unknown): number {
  if (n == null) return 0;
  const num = Number(n);
  return isNaN(num) ? 0 : Math.ceil(num);
}

export function abs(n: unknown): number {
  if (n == null) return 0;
  const num = Number(n);
  return isNaN(num) ? 0 : Math.abs(num);
}

export function min(...values: unknown[]): number {
  const nums = values
    .flat()
    .map(Number)
    .filter((n) => !isNaN(n));
  return nums.length ? Math.min(...nums) : 0;
}

export function max(...values: unknown[]): number {
  const nums = values
    .flat()
    .map(Number)
    .filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) : 0;
}

export function clamp(n: unknown, minVal: number, maxVal: number): number {
  if (n == null) return minVal;
  const num = Number(n);
  if (isNaN(num)) return minVal;
  return Math.min(Math.max(num, minVal), maxVal);
}

export function random(min: number = 0, max: number = 1): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =============================================================================
// ARRAY FUNCTIONS
// =============================================================================

export function sum(arr: unknown[]): number {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc: number, val) => acc + (Number(val) || 0), 0);
}

export function avg(arr: unknown[]): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

export function count(arr: unknown[]): number {
  if (!Array.isArray(arr)) return 0;
  return arr.length;
}

export function first<T>(arr: T[]): T | undefined {
  if (!Array.isArray(arr)) return undefined;
  return arr[0];
}

export function last<T>(arr: T[]): T | undefined {
  if (!Array.isArray(arr)) return undefined;
  return arr[arr.length - 1];
}

export function unique<T>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)];
}

export function flatten<T>(arr: T[][]): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.flat();
}

export function reverse<T>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return [];
  return [...arr].reverse();
}

export function sort<T>(arr: T[], key?: string | ((item: T) => unknown)): T[] {
  if (!Array.isArray(arr)) return [];
  const sorted = [...arr];

  if (key === undefined) {
    return sorted.sort();
  }

  if (typeof key === 'string') {
    // Support nested paths like "meta.priority"
    const getNestedValue = (obj: unknown, path: string): unknown => {
      const keys = path.split('.');
      let current: unknown = obj;
      for (const k of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[k];
      }
      return current;
    };

    return sorted.sort((a, b) => {
      const aVal = getNestedValue(a, key);
      const bVal = getNestedValue(b, key);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }

  return sorted.sort((a, b) => {
    const aVal = key(a) as string | number;
    const bVal = key(b) as string | number;
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
}

export function sortDesc<T>(arr: T[], key?: string | ((item: T) => unknown)): T[] {
  return sort(arr, key).reverse();
}

export function groupBy<T>(arr: T[], key: string | ((item: T) => string)): Record<string, T[]> {
  if (!Array.isArray(arr)) return {};

  // Support nested paths like "meta.priority"
  const getValue = (obj: unknown, path: string): unknown => {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const k of keys) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[k];
    }
    return current;
  };

  return arr.reduce(
    (acc, item) => {
      const groupKey = typeof key === 'string' ? String(getValue(item, key)) : key(item);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function keyBy<T>(arr: T[], key: string | ((item: T) => string)): Record<string, T> {
  if (!Array.isArray(arr)) return {};

  // Support nested paths like "meta.id"
  const getValue = (obj: unknown, path: string): unknown => {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const k of keys) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[k];
    }
    return current;
  };

  return arr.reduce(
    (acc, item) => {
      const k = typeof key === 'string' ? String(getValue(item, key)) : key(item);
      acc[k] = item;
      return acc;
    },
    {} as Record<string, T>
  );
}

export function zip<A, B>(arr1: A[], arr2: B[]): [A, B][] {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  const len = Math.min(arr1.length, arr2.length);
  const result: [A, B][] = [];
  for (let i = 0; i < len; i++) {
    result.push([arr1[i], arr2[i]]);
  }
  return result;
}

export function compact<T>(arr: T[]): NonNullable<T>[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is NonNullable<T> => x != null);
}

export function take<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n);
}

export function drop<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.slice(n);
}

export function range(start: number, end?: number, step: number = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  const result: number[] = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    result.push(i);
  }
  return result;
}

// =============================================================================
// OBJECT FUNCTIONS
// =============================================================================

export function keys(obj: unknown): string[] {
  if (obj == null || typeof obj !== 'object') return [];
  return Object.keys(obj);
}

export function values(obj: unknown): unknown[] {
  if (obj == null || typeof obj !== 'object') return [];
  return Object.values(obj);
}

export function entries(obj: unknown): [string, unknown][] {
  if (obj == null || typeof obj !== 'object') return [];
  return Object.entries(obj);
}

export function merge(...objects: unknown[]): object {
  return Object.assign({}, ...objects.filter((o) => o != null && typeof o === 'object'));
}

export function pick(obj: unknown, ...keys: string[]): object {
  if (obj == null || typeof obj !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const key of keys.flat()) {
    if (key in obj) {
      result[key] = (obj as any)[key];
    }
  }
  return result;
}

export function omit(obj: unknown, ...keys: string[]): object {
  if (obj == null || typeof obj !== 'object') return {};
  const keySet = new Set(keys.flat());
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!keySet.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

export function get(obj: unknown, path: string, defaultValue?: unknown): unknown {
  if (obj == null) return defaultValue;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as any)[key];
  }

  return current ?? defaultValue;
}

export function set(obj: unknown, path: string, value: unknown): object {
  if (obj == null || typeof obj !== 'object') return {};

  const result = { ...obj } as Record<string, unknown>;
  const keys = path.split('.');
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...(current[key] as object) };
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// =============================================================================
// TYPE FUNCTIONS
// =============================================================================

export function type(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

export function toString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export function toBoolean(value: unknown): boolean {
  return Boolean(value);
}

export function toArray<T>(value: T | T[]): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function toJSON(value: unknown): string {
  return JSON.stringify(value);
}

export function fromJSON(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// =============================================================================
// DATE FUNCTIONS
// =============================================================================

export function now(): Date {
  return new Date();
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(date: unknown, format: string = 'YYYY-MM-DD'): string {
  const d = date instanceof Date ? date : new Date(String(date));
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function coalesce(...values: unknown[]): unknown {
  for (const value of values) {
    if (value != null) return value;
  }
  return undefined;
}

export function defaultValue<T>(value: T | null | undefined, defaultVal: T): T {
  return value ?? defaultVal;
}

export function ifThen<T>(condition: boolean, thenValue: T, elseValue: T): T {
  return condition ? thenValue : elseValue;
}

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// STRICT MODE ASSERTIONS
// =============================================================================

export function assertNonNull<T>(value: T, message?: string): NonNullable<T> {
  if (value == null) {
    throw new TransformError(message ?? 'Value is null or undefined', 'NULL_VALUE');
  }
  return value as NonNullable<T>;
}

export function assertType(
  value: unknown,
  expectedType: string,
  nonNull: boolean = false
): unknown {
  if (nonNull && value == null) {
    throw new TransformError(`Expected non-null ${expectedType}, got ${value}`, 'NULL_VALUE');
  }

  if (value == null) return value;

  const actualType = type(value);
  if (actualType !== expectedType && expectedType !== 'any') {
    throw new TransformError(`Expected ${expectedType}, got ${actualType}`, 'TYPE_MISMATCH');
  }

  return value;
}

export function assertArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new TransformError(`Expected array, got ${type(value)}`, 'TYPE_MISMATCH');
  }
  return value;
}

// =============================================================================
// HELPERS BUNDLE
// =============================================================================

export const helpers = {
  // String
  upper,
  lower,
  trim,
  split,
  join,
  substring,
  replace,
  replaceAll,
  matches,
  startsWith,
  endsWith,
  contains,
  padStart,
  padEnd,
  capitalize,
  camelCase,
  snakeCase,
  kebabCase,

  // Number
  round,
  floor,
  ceil,
  abs,
  min,
  max,
  clamp,
  random,
  randomInt,

  // Array
  sum,
  avg,
  count,
  first,
  last,
  unique,
  flatten,
  reverse,
  sort,
  sortDesc,
  groupBy,
  keyBy,
  zip,
  compact,
  take,
  drop,
  range,

  // Object
  keys,
  values,
  entries,
  merge,
  pick,
  omit,
  get,
  set,

  // Type
  type,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isNull,
  isUndefined,
  isEmpty,

  // Conversion
  toString,
  toNumber,
  toBoolean,
  toArray,
  toJSON,
  fromJSON,

  // Date
  now,
  today,
  formatDate,
  parseDate,

  // Utility
  coalesce,
  default: defaultValue,
  if: ifThen,
  uuid,

  // Assertions (legacy)
  assertNonNull,
  assertType,
  assertArray,

  // Strict Mode Helpers
  strictGet,
  strictIndex,
  strictArray,
  strictNonNull,
  strictType,
  strictFilter,
  strictMap,
};

export default helpers;
