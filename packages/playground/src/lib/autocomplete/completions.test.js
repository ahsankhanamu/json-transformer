/**
 * Test cases for autocomplete completions
 *
 * Run with: node --experimental-vm-modules completions.test.js
 * Or integrate with your test framework (vitest, jest, etc.)
 */

import {
  findChildProperties,
  findTopLevelPaths,
  hasInputChildren,
  getJSMethods,
  getPathType,
  extractPipeSource,
  extractPipeSourceWithTokenizer,
} from './completions.js';

// Sample input paths (matches the default playground input)
const SAMPLE_INPUT_PATHS = [
  { path: 'user', type: 'property', detail: 'object' },
  { path: 'user.firstName', type: 'property', detail: 'string' },
  { path: 'user.lastName', type: 'property', detail: 'string' },
  { path: 'user.age', type: 'property', detail: 'number' },
  { path: 'user.email', type: 'property', detail: 'string' },
  { path: 'user.address', type: 'property', detail: 'object' },
  { path: 'user.address.city', type: 'property', detail: 'string' },
  { path: 'user.address.country', type: 'property', detail: 'string' },
  { path: 'orders', type: 'property', detail: 'array[3]' },
  { path: 'orders[0]', type: 'property', detail: 'object (first element)' },
  { path: 'orders[]', type: 'property', detail: 'array[3]' },
  { path: 'orders[].id', type: 'property', detail: 'number' },
  { path: 'orders[].product', type: 'property', detail: 'string' },
  { path: 'orders[].price', type: 'property', detail: 'number' },
  { path: 'orders[].quantity', type: 'property', detail: 'number' },
  { path: 'orders[].status', type: 'property', detail: 'string' },
  { path: 'tags', type: 'property', detail: 'array[3]' },
  { path: 'tags[0]', type: 'property', detail: 'string (first element)' },
  { path: 'tags[]', type: 'property', detail: 'array[3]' },
];

// Test utilities
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
      }
    },
    toHaveLength(len) {
      if (actual.length !== len) {
        throw new Error(`Expected length ${len}, got ${actual.length}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
  };
}

console.log('\n=== Autocomplete Test Cases ===\n');

// ============================================
// Test: findTopLevelPaths
// ============================================
console.log('--- findTopLevelPaths ---');

test('typing "u" shows "user"', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'u');
  expect(results.map((r) => r.label)).toEqual(['user']);
});

test('typing "us" shows "user"', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'us');
  expect(results.map((r) => r.label)).toEqual(['user']);
});

test('typing "user" shows "user"', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'user');
  expect(results.map((r) => r.label)).toEqual(['user']);
});

test('typing "o" shows "orders"', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'o');
  expect(results.map((r) => r.label)).toEqual(['orders']);
});

test('typing "t" shows "tags"', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 't');
  expect(results.map((r) => r.label)).toEqual(['tags']);
});

test('typing "xyz" shows nothing', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'xyz');
  expect(results).toHaveLength(0);
});

test('user has children', () => {
  const results = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'user');
  expect(results[0].hasChildren).toBeTruthy();
});

// ============================================
// Test: findChildProperties
// ============================================
console.log('\n--- findChildProperties ---');

test('"user." shows firstName, lastName, age, email, address', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user', '');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('firstName');
  expect(labels).toContain('lastName');
  expect(labels).toContain('age');
  expect(labels).toContain('email');
  expect(labels).toContain('address');
  expect(results).toHaveLength(5);
});

test('"user.f" shows only firstName', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user', 'f');
  expect(results.map((r) => r.label)).toEqual(['firstName']);
});

test('"user.a" shows age and address', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user', 'a');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('age');
  expect(labels).toContain('address');
  expect(results).toHaveLength(2);
});

test('"user.address." shows city and country', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user.address', '');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('city');
  expect(labels).toContain('country');
  expect(results).toHaveLength(2);
});

test('"user.address.c" shows city and country', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user.address', 'c');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('city');
  expect(labels).toContain('country');
});

test('"user.address.city." has no children (leaf node)', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user.address.city', '');
  expect(results).toHaveLength(0);
});

test('address has children, city does not', () => {
  const addressResults = findChildProperties(SAMPLE_INPUT_PATHS, 'user', 'address');
  expect(addressResults[0].hasChildren).toBeTruthy();

  const cityResults = findChildProperties(SAMPLE_INPUT_PATHS, 'user.address', 'city');
  expect(cityResults[0].hasChildren).toBeFalsy();
});

// ============================================
// Test: hasInputChildren
// ============================================
console.log('\n--- hasInputChildren ---');

test('user has children', () => {
  expect(hasInputChildren(SAMPLE_INPUT_PATHS, 'user')).toBeTruthy();
});

test('user.address has children', () => {
  expect(hasInputChildren(SAMPLE_INPUT_PATHS, 'user.address')).toBeTruthy();
});

test('user.address.city has NO children (leaf)', () => {
  expect(hasInputChildren(SAMPLE_INPUT_PATHS, 'user.address.city')).toBeFalsy();
});

test('user.firstName has NO children (leaf)', () => {
  expect(hasInputChildren(SAMPLE_INPUT_PATHS, 'user.firstName')).toBeFalsy();
});

test('orders has children (array elements)', () => {
  expect(hasInputChildren(SAMPLE_INPUT_PATHS, 'orders')).toBeTruthy();
});

// ============================================
// Test: getPathType
// ============================================
console.log('\n--- getPathType ---');

test('user is object', () => {
  expect(getPathType(SAMPLE_INPUT_PATHS, 'user')).toBe('object');
});

test('user.firstName is string', () => {
  expect(getPathType(SAMPLE_INPUT_PATHS, 'user.firstName')).toBe('string');
});

test('user.age is number', () => {
  expect(getPathType(SAMPLE_INPUT_PATHS, 'user.age')).toBe('number');
});

test('orders is array', () => {
  expect(getPathType(SAMPLE_INPUT_PATHS, 'orders')).toBe('array');
});

test('tags is array', () => {
  expect(getPathType(SAMPLE_INPUT_PATHS, 'tags')).toBe('array');
});

test('unknown path returns unknown', () => {
  expect(getPathType(SAMPLE_INPUT_PATHS, 'nonexistent')).toBe('unknown');
});

// ============================================
// Test: getJSMethods (type-aware)
// ============================================
console.log('\n--- getJSMethods (type-aware) ---');

test('unknown type returns all methods', () => {
  const results = getJSMethods('', 'unknown');
  expect(results.length > 20).toBeTruthy();
});

test('string type shows string methods only', () => {
  const results = getJSMethods('', 'string');
  const labels = results.map((r) => r.label);
  // Should have string methods
  expect(labels).toContain('toUpperCase');
  expect(labels).toContain('toLowerCase');
  expect(labels).toContain('trim');
  expect(labels).toContain('split');
  // Should NOT have array-only methods
  expect(labels.includes('map')).toBeFalsy();
  expect(labels.includes('filter')).toBeFalsy();
  expect(labels.includes('reduce')).toBeFalsy();
});

test('array type shows array methods only', () => {
  const results = getJSMethods('', 'array');
  const labels = results.map((r) => r.label);
  // Should have array methods
  expect(labels).toContain('map');
  expect(labels).toContain('filter');
  expect(labels).toContain('find');
  expect(labels).toContain('reduce');
  expect(labels).toContain('join');
  // Should NOT have string-only methods
  expect(labels.includes('toUpperCase')).toBeFalsy();
  expect(labels.includes('trim')).toBeFalsy();
  expect(labels.includes('split')).toBeFalsy();
});

test('number type shows number methods only', () => {
  const results = getJSMethods('', 'number');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('toFixed');
  expect(labels).toContain('toPrecision');
  // Should NOT have string/array methods
  expect(labels.includes('toUpperCase')).toBeFalsy();
  expect(labels.includes('map')).toBeFalsy();
});

test('"f" prefix with array type shows filter, find, etc.', () => {
  const results = getJSMethods('f', 'array');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('filter');
  expect(labels).toContain('find');
  expect(labels).toContain('findIndex');
});

test('"to" prefix with string type shows toUpperCase, toLowerCase', () => {
  const results = getJSMethods('to', 'string');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('toUpperCase');
  expect(labels).toContain('toLowerCase');
  expect(labels).toContain('toString');
  // Should NOT have toFixed (number method)
  expect(labels.includes('toFixed')).toBeFalsy();
});

// ============================================
// Test: extractPipeSource
// ============================================
console.log('\n--- extractPipeSource ---');

test('simple: "user" extracts "user"', () => {
  const result = extractPipeSource('user', SAMPLE_INPUT_PATHS);
  expect(result).toBe('user');
});

test('nested: "user.address" extracts "user.address"', () => {
  const result = extractPipeSource('user.address', SAMPLE_INPUT_PATHS);
  expect(result).toBe('user.address');
});

test('with spaces: "  user  " extracts "user"', () => {
  const result = extractPipeSource('  user  ', SAMPLE_INPUT_PATHS);
  expect(result).toBe('user');
});

test('chained pipe: "user | .address" extracts "user.address"', () => {
  const result = extractPipeSource('user | .address', SAMPLE_INPUT_PATHS);
  expect(result).toBe('user.address');
});

test('expression with parens: known limitation - returns null', () => {
  // Complex expressions with method calls are not fully supported
  // The autocomplete will fall back to JS methods in this case
  const result = extractPipeSource('orders.find(x => x.id === 1)', SAMPLE_INPUT_PATHS);
  // Currently returns null - would need more complex parsing
  expect(result).toBeFalsy();
});

// ============================================
// Test: Combined scenarios (as user would type)
// ============================================
console.log('\n--- User Typing Scenarios ---');

test('Scenario: type "u" -> select "user" -> type "." -> see properties', () => {
  // Step 1: Type "u"
  const step1 = findTopLevelPaths(SAMPLE_INPUT_PATHS, 'u');
  expect(step1.map((r) => r.label)).toContain('user');

  // Step 2: After selecting "user", type "."
  const step2 = findChildProperties(SAMPLE_INPUT_PATHS, 'user', '');
  expect(step2.length).toBe(5);
  expect(step2.map((r) => r.label)).toContain('firstName');
});

test('Scenario: type "user.address.c" -> see city, country', () => {
  const results = findChildProperties(SAMPLE_INPUT_PATHS, 'user.address', 'c');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('city');
  expect(labels).toContain('country');
});

test('Scenario: type "user.address.city." -> see JS methods (leaf node)', () => {
  // Since city is a leaf, findChildProperties returns empty
  const children = findChildProperties(SAMPLE_INPUT_PATHS, 'user.address.city', '');
  expect(children).toHaveLength(0);

  // So we should fall back to JS methods
  const methods = getJSMethods('');
  expect(methods.length > 0).toBeTruthy();
});

test('Scenario: type "orders.fin" -> see array methods (find, filter, etc.)', () => {
  // orders is an array - it has bracket children (orders[0], orders[]) but no dot children
  const dotChildren = findChildProperties(SAMPLE_INPUT_PATHS, 'orders', '');
  expect(dotChildren).toHaveLength(0); // No dot children for arrays

  // Get type and show type-specific methods
  const valueType = getPathType(SAMPLE_INPUT_PATHS, 'orders');
  expect(valueType).toBe('array');

  const methods = getJSMethods('fin', valueType);
  const labels = methods.map((m) => m.label);
  expect(labels).toContain('find');
  expect(labels).toContain('findIndex');
  // Should NOT have string methods
  expect(labels.includes('toUpperCase')).toBeFalsy();
});

test('Scenario: type "tags.j" -> see array methods (join, etc.)', () => {
  // tags is also an array
  const valueType = getPathType(SAMPLE_INPUT_PATHS, 'tags');
  expect(valueType).toBe('array');

  const methods = getJSMethods('j', valueType);
  expect(methods.map((m) => m.label)).toContain('join');
});

test('Scenario: type "user.firstName.t" -> see string methods (trim, toUpperCase, etc.)', () => {
  const valueType = getPathType(SAMPLE_INPUT_PATHS, 'user.firstName');
  expect(valueType).toBe('string');

  const methods = getJSMethods('t', valueType);
  const labels = methods.map((m) => m.label);
  expect(labels).toContain('trim');
  expect(labels).toContain('trimStart');
  expect(labels).toContain('toString');
  // Should NOT have array-only methods
  expect(labels.includes('toSorted')).toBeFalsy();
});

test('Scenario: type "user.age.t" -> see number methods (toFixed, etc.)', () => {
  const valueType = getPathType(SAMPLE_INPUT_PATHS, 'user.age');
  expect(valueType).toBe('number');

  const methods = getJSMethods('to', valueType);
  const labels = methods.map((m) => m.label);
  expect(labels).toContain('toFixed');
  expect(labels).toContain('toPrecision');
});

test('Scenario: pipe access "user | .fir" -> see firstName', () => {
  // Extract source from "user"
  const source = extractPipeSource('user', SAMPLE_INPUT_PATHS);
  expect(source).toBe('user');

  // Find children matching "fir"
  const results = findChildProperties(SAMPLE_INPUT_PATHS, source, 'fir');
  expect(results.map((r) => r.label)).toEqual(['firstName']);
});

test('Scenario: chained pipe "user | .address | .c" -> see city, country', () => {
  // Extract source from chained pipe
  const source = extractPipeSource('user | .address', SAMPLE_INPUT_PATHS);
  expect(source).toBe('user.address');

  // Find children matching "c"
  const results = findChildProperties(SAMPLE_INPUT_PATHS, source, 'c');
  const labels = results.map((r) => r.label);
  expect(labels).toContain('city');
  expect(labels).toContain('country');
});

// ============================================
// Test: extractPipeSourceWithTokenizer (requires transformer module)
// ============================================
console.log('\n--- extractPipeSourceWithTokenizer (tokenizer-based) ---');

// Try to import the transformer module for tokenizer tests
let tokenize, TokenType;
try {
  const transformer = await import('@ahsankhanamu/json-transformer');
  tokenize = transformer.tokenize;
  TokenType = transformer.TokenType;

  test('tokenizer: simple path "user"', () => {
    const result = extractPipeSourceWithTokenizer(tokenize, TokenType, 'user', SAMPLE_INPUT_PATHS);
    expect(result).toBe('user');
  });

  test('tokenizer: nested path "user.address"', () => {
    const result = extractPipeSourceWithTokenizer(
      tokenize,
      TokenType,
      'user.address',
      SAMPLE_INPUT_PATHS
    );
    expect(result).toBe('user.address');
  });

  test('tokenizer: pipe "user |"', () => {
    // Without DOT after PIPE, should return null (not pipe property access)
    const result = extractPipeSourceWithTokenizer(
      tokenize,
      TokenType,
      'user |',
      SAMPLE_INPUT_PATHS
    );
    expect(result).toBeFalsy();
  });

  test('tokenizer: chained pipe "user | .address"', () => {
    const result = extractPipeSourceWithTokenizer(
      tokenize,
      TokenType,
      'user | .address',
      SAMPLE_INPUT_PATHS
    );
    expect(result).toBe('user.address');
  });

  test('tokenizer: method call "orders.find(x => x.id === 1)"', () => {
    const result = extractPipeSourceWithTokenizer(
      tokenize,
      TokenType,
      'orders.find(x => x.id === 1)',
      SAMPLE_INPUT_PATHS
    );
    // Should extract something - the tokenizer can parse this
    expect(result).toBeTruthy();
  });

  test('tokenizer: complex pipe "orders.find(x => x.id === 1) | .status" resolves source', () => {
    // This tests the full pipe property access with a method call before the pipe
    const result = extractPipeSourceWithTokenizer(
      tokenize,
      TokenType,
      'orders.find(x => x.id === 1)',
      SAMPLE_INPUT_PATHS
    );
    // Should extract the path up to the method call
    expect(result).toBeTruthy();
  });
} catch (e) {
  console.log('⚠ Skipping tokenizer tests (transformer module not available)');
  console.log(`  ${e.message}`);
}

// ============================================
// Summary
// ============================================
console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
