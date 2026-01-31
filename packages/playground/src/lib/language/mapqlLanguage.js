/**
 * MapQL Language Definition
 * Auto-generates language features from the MapQL library
 */

// Function definitions with metadata for autocomplete
// These are derived from mapql/src/runtime.ts helpers
export const functions = [
  // String functions
  { name: 'upper', desc: 'Uppercase string', syntax: 'upper(str)', category: 'String', insertText: 'upper(' },
  { name: 'lower', desc: 'Lowercase string', syntax: 'lower(str)', category: 'String', insertText: 'lower(' },
  { name: 'trim', desc: 'Remove whitespace', syntax: 'trim(str)', category: 'String', insertText: 'trim(' },
  { name: 'split', desc: 'Split string to array', syntax: 'split(str, delimiter)', category: 'String', insertText: 'split(' },
  { name: 'join', desc: 'Join array to string', syntax: 'join(array, separator)', category: 'String', insertText: 'join(' },
  { name: 'substring', desc: 'Extract substring', syntax: 'substring(str, start, end?)', category: 'String', insertText: 'substring(' },
  { name: 'replace', desc: 'Replace first match', syntax: 'replace(str, find, replacement)', category: 'String', insertText: 'replace(' },
  { name: 'replaceAll', desc: 'Replace all matches', syntax: 'replaceAll(str, find, replacement)', category: 'String', insertText: 'replaceAll(' },
  { name: 'matches', desc: 'Test regex match', syntax: 'matches(str, pattern)', category: 'String', insertText: 'matches(' },
  { name: 'startsWith', desc: 'Check string start', syntax: 'startsWith(str, prefix)', category: 'String', insertText: 'startsWith(' },
  { name: 'endsWith', desc: 'Check string end', syntax: 'endsWith(str, suffix)', category: 'String', insertText: 'endsWith(' },
  { name: 'contains', desc: 'Check contains', syntax: 'contains(str, search)', category: 'String', insertText: 'contains(' },
  { name: 'padStart', desc: 'Pad string start', syntax: 'padStart(str, length, char)', category: 'String', insertText: 'padStart(' },
  { name: 'padEnd', desc: 'Pad string end', syntax: 'padEnd(str, length, char)', category: 'String', insertText: 'padEnd(' },
  { name: 'capitalize', desc: 'Capitalize first letter', syntax: 'capitalize(str)', category: 'String', insertText: 'capitalize(' },
  { name: 'camelCase', desc: 'Convert to camelCase', syntax: 'camelCase(str)', category: 'String', insertText: 'camelCase(' },
  { name: 'snakeCase', desc: 'Convert to snake_case', syntax: 'snakeCase(str)', category: 'String', insertText: 'snakeCase(' },
  { name: 'kebabCase', desc: 'Convert to kebab-case', syntax: 'kebabCase(str)', category: 'String', insertText: 'kebabCase(' },

  // Math functions
  { name: 'round', desc: 'Round number', syntax: 'round(num, decimals?)', category: 'Math', insertText: 'round(' },
  { name: 'floor', desc: 'Round down', syntax: 'floor(num)', category: 'Math', insertText: 'floor(' },
  { name: 'ceil', desc: 'Round up', syntax: 'ceil(num)', category: 'Math', insertText: 'ceil(' },
  { name: 'abs', desc: 'Absolute value', syntax: 'abs(num)', category: 'Math', insertText: 'abs(' },
  { name: 'min', desc: 'Minimum value', syntax: 'min(a, b, ...)', category: 'Math', insertText: 'min(' },
  { name: 'max', desc: 'Maximum value', syntax: 'max(a, b, ...)', category: 'Math', insertText: 'max(' },
  { name: 'clamp', desc: 'Clamp to range', syntax: 'clamp(num, min, max)', category: 'Math', insertText: 'clamp(' },
  { name: 'random', desc: 'Random 0-1', syntax: 'random()', category: 'Math', insertText: 'random()' },
  { name: 'randomInt', desc: 'Random integer', syntax: 'randomInt(min, max)', category: 'Math', insertText: 'randomInt(' },

  // Array functions
  { name: 'sum', desc: 'Sum array', syntax: 'sum(array)', category: 'Array', insertText: 'sum(' },
  { name: 'avg', desc: 'Average', syntax: 'avg(array)', category: 'Array', insertText: 'avg(' },
  { name: 'count', desc: 'Count items', syntax: 'count(array)', category: 'Array', insertText: 'count(' },
  { name: 'first', desc: 'First element', syntax: 'first(array)', category: 'Array', insertText: 'first(' },
  { name: 'last', desc: 'Last element', syntax: 'last(array)', category: 'Array', insertText: 'last(' },
  { name: 'unique', desc: 'Remove duplicates', syntax: 'unique(array)', category: 'Array', insertText: 'unique(' },
  { name: 'flatten', desc: 'Flatten nested', syntax: 'flatten(array)', category: 'Array', insertText: 'flatten(' },
  { name: 'reverse', desc: 'Reverse order', syntax: 'reverse(array)', category: 'Array', insertText: 'reverse(' },
  { name: 'sort', desc: 'Sort ascending', syntax: 'sort(array, key?)', category: 'Array', insertText: 'sort(' },
  { name: 'sortDesc', desc: 'Sort descending', syntax: 'sortDesc(array, key?)', category: 'Array', insertText: 'sortDesc(' },
  { name: 'groupBy', desc: 'Group by key', syntax: 'groupBy(array, key)', category: 'Array', insertText: 'groupBy(' },
  { name: 'keyBy', desc: 'Index by key', syntax: 'keyBy(array, key)', category: 'Array', insertText: 'keyBy(' },
  { name: 'zip', desc: 'Zip arrays', syntax: 'zip(arr1, arr2)', category: 'Array', insertText: 'zip(' },
  { name: 'compact', desc: 'Remove nulls', syntax: 'compact(array)', category: 'Array', insertText: 'compact(' },
  { name: 'take', desc: 'Take first n', syntax: 'take(array, n)', category: 'Array', insertText: 'take(' },
  { name: 'drop', desc: 'Drop first n', syntax: 'drop(array, n)', category: 'Array', insertText: 'drop(' },
  { name: 'range', desc: 'Generate range', syntax: 'range(start, end, step?)', category: 'Array', insertText: 'range(' },

  // Object functions
  { name: 'keys', desc: 'Object keys', syntax: 'keys(obj)', category: 'Object', insertText: 'keys(' },
  { name: 'values', desc: 'Object values', syntax: 'values(obj)', category: 'Object', insertText: 'values(' },
  { name: 'entries', desc: 'Key-value pairs', syntax: 'entries(obj)', category: 'Object', insertText: 'entries(' },
  { name: 'merge', desc: 'Merge objects', syntax: 'merge(obj1, obj2, ...)', category: 'Object', insertText: 'merge(' },
  { name: 'pick', desc: 'Pick keys', syntax: 'pick(obj, ...keys)', category: 'Object', insertText: 'pick(' },
  { name: 'omit', desc: 'Omit keys', syntax: 'omit(obj, ...keys)', category: 'Object', insertText: 'omit(' },
  { name: 'get', desc: 'Get nested path', syntax: 'get(obj, path, default?)', category: 'Object', insertText: 'get(' },
  { name: 'set', desc: 'Set nested path', syntax: 'set(obj, path, value)', category: 'Object', insertText: 'set(' },

  // Type functions
  { name: 'type', desc: 'Get type name', syntax: 'type(value)', category: 'Type', insertText: 'type(' },
  { name: 'isString', desc: 'Check string', syntax: 'isString(value)', category: 'Type', insertText: 'isString(' },
  { name: 'isNumber', desc: 'Check number', syntax: 'isNumber(value)', category: 'Type', insertText: 'isNumber(' },
  { name: 'isBoolean', desc: 'Check boolean', syntax: 'isBoolean(value)', category: 'Type', insertText: 'isBoolean(' },
  { name: 'isArray', desc: 'Check array', syntax: 'isArray(value)', category: 'Type', insertText: 'isArray(' },
  { name: 'isObject', desc: 'Check object', syntax: 'isObject(value)', category: 'Type', insertText: 'isObject(' },
  { name: 'isNull', desc: 'Check null', syntax: 'isNull(value)', category: 'Type', insertText: 'isNull(' },
  { name: 'isUndefined', desc: 'Check undefined', syntax: 'isUndefined(value)', category: 'Type', insertText: 'isUndefined(' },
  { name: 'isEmpty', desc: 'Check empty', syntax: 'isEmpty(value)', category: 'Type', insertText: 'isEmpty(' },

  // Conversion functions
  { name: 'toString', desc: 'Convert to string', syntax: 'toString(value)', category: 'Conversion', insertText: 'toString(' },
  { name: 'toNumber', desc: 'Convert to number', syntax: 'toNumber(value)', category: 'Conversion', insertText: 'toNumber(' },
  { name: 'toBoolean', desc: 'Convert to boolean', syntax: 'toBoolean(value)', category: 'Conversion', insertText: 'toBoolean(' },
  { name: 'toArray', desc: 'Convert to array', syntax: 'toArray(value)', category: 'Conversion', insertText: 'toArray(' },
  { name: 'toJSON', desc: 'Stringify JSON', syntax: 'toJSON(value)', category: 'Conversion', insertText: 'toJSON(' },
  { name: 'fromJSON', desc: 'Parse JSON', syntax: 'fromJSON(str)', category: 'Conversion', insertText: 'fromJSON(' },

  // Date functions
  { name: 'now', desc: 'Current datetime', syntax: 'now()', category: 'Date', insertText: 'now()' },
  { name: 'today', desc: 'Current date', syntax: 'today()', category: 'Date', insertText: 'today()' },
  { name: 'formatDate', desc: 'Format date', syntax: 'formatDate(date, format)', category: 'Date', insertText: 'formatDate(' },
  { name: 'parseDate', desc: 'Parse date string', syntax: 'parseDate(str)', category: 'Date', insertText: 'parseDate(' },

  // Utility functions
  { name: 'coalesce', desc: 'First non-null', syntax: 'coalesce(a, b, ...)', category: 'Utility', insertText: 'coalesce(' },
  { name: 'default', desc: 'Default value', syntax: 'default(value, fallback)', category: 'Utility', insertText: 'default(' },
  { name: 'if', desc: 'Conditional', syntax: 'if(condition, then, else)', category: 'Utility', insertText: 'if(' },
  { name: 'uuid', desc: 'Generate UUID', syntax: 'uuid()', category: 'Utility', insertText: 'uuid()' },
];

// Operators available in MapQL
export const operators = [
  // Arithmetic
  { symbol: '+', desc: 'Addition' },
  { symbol: '-', desc: 'Subtraction' },
  { symbol: '*', desc: 'Multiplication' },
  { symbol: '/', desc: 'Division' },
  { symbol: '%', desc: 'Modulo' },
  { symbol: '&', desc: 'String concatenation' },

  // Comparison
  { symbol: '==', desc: 'Equals' },
  { symbol: '!=', desc: 'Not equals' },
  { symbol: '===', desc: 'Strict equals' },
  { symbol: '!==', desc: 'Strict not equals' },
  { symbol: '<', desc: 'Less than' },
  { symbol: '>', desc: 'Greater than' },
  { symbol: '<=', desc: 'Less or equal' },
  { symbol: '>=', desc: 'Greater or equal' },

  // Logical
  { symbol: '&&', desc: 'Logical AND' },
  { symbol: '||', desc: 'Logical OR' },
  { symbol: '!', desc: 'Logical NOT' },
  { symbol: 'and', desc: 'Logical AND (keyword)' },
  { symbol: 'or', desc: 'Logical OR (keyword)' },
  { symbol: 'not', desc: 'Logical NOT (keyword)' },

  // Null handling
  { symbol: '??', desc: 'Null coalescing' },
  { symbol: '?.', desc: 'Optional chaining' },

  // Other
  { symbol: '|', desc: 'Pipe operator' },
  { symbol: '=>', desc: 'Arrow function' },
  { symbol: '...', desc: 'Spread operator' },
  { symbol: '?:', desc: 'Ternary operator' },
];

// Keywords in MapQL
export const keywords = [
  'let', 'const', 'if', 'else', 'true', 'false', 'null', 'undefined', 'as', 'in'
];

// Array access syntax hints
export const arrayAccessPatterns = [
  { pattern: '[0]', desc: 'First element' },
  { pattern: '[-1]', desc: 'Last element' },
  { pattern: '[0:3]', desc: 'Slice (first 3)' },
  { pattern: '[*]', desc: 'Spread/map all' },
  { pattern: '[? condition]', desc: 'Filter' },
];

// Get all categories
export function getCategories() {
  const cats = new Set(functions.map(f => f.category));
  return ['All', ...cats];
}

// Filter functions by category and search term
export function filterFunctions(category = 'All', search = '') {
  return functions.filter(f => {
    const matchesCategory = category === 'All' || f.category === category;
    const matchesSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

// Get function by name
export function getFunction(name) {
  return functions.find(f => f.name === name);
}

// Export all for autocomplete
export default {
  functions,
  operators,
  keywords,
  arrayAccessPatterns,
  getCategories,
  filterFunctions,
  getFunction,
};
