/**
 * MapQL Playground - Interactive testing
 * Run with: npx tsx src/playground.ts
 */

import { compile, evaluate, toJavaScript, parse, validate } from './index.js';

// =============================================================================
// TEST DATA
// =============================================================================

const testData = {
  user: {
    firstName: 'John',
    lastName: 'Doe',
    age: 32,
    email: 'john@example.com',
    address: {
      city: 'New York',
      country: 'USA',
    },
  },
  orders: [
    { id: 1, product: 'Widget', price: 25.99, quantity: 2, status: 'shipped' },
    { id: 2, product: 'Gadget', price: 49.99, quantity: 1, status: 'pending' },
    { id: 3, product: 'Gizmo', price: 15.00, quantity: 5, status: 'shipped' },
  ],
  tags: ['electronics', 'sale', 'featured'],
  metadata: {
    version: '2.0',
    lastUpdated: '2024-01-15',
  },
};

// =============================================================================
// TEST EXPRESSIONS
// =============================================================================

const expressions = [
  // Simple access
  'user.firstName',
  'user.address.city',
  'orders[0].product',
  'orders[-1].price',

  // Array operations
  'orders[*].product',
  'orders[0:2]',
  'tags[1]',

  // Arithmetic
  'orders[0].price * orders[0].quantity',
  '100 + 50 * 2',

  // String operations
  'user.firstName & " " & user.lastName',
  '`Hello ${user.firstName}!`',

  // Comparisons
  'user.age >= 18',
  'user.age > 30 && user.age < 40',

  // Null coalescing
  'user.nickname ?? user.firstName',
  'user.middleName ?? "N/A"',

  // Ternary
  'user.age >= 18 ? "Adult" : "Minor"',

  // Pipe operations
  'user.firstName | upper',
  'user.email | lower | trim',

  // Object construction
  '{ name: user.firstName, city: user.address.city }',
  '{ fullName: `${user.firstName} ${user.lastName}`, age: user.age }',

  // Function calls
  'upper(user.firstName)',
  'round(orders[0].price, 1)',
  'count(orders)',
  'sum(orders[*].price)',

  // Complex transformations
  `{
    customer: user.firstName & " " & user.lastName,
    totalOrders: count(orders),
    totalValue: sum(orders[*].price)
  }`,

  // Variables
  `let total = orders[0].price * orders[0].quantity;
   let tax = total * 0.1;
   { subtotal: total, tax: tax, total: total + tax }`,

  // Filters
  'orders[? status == "shipped"]',
];

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('='.repeat(80));
console.log('MapQL Playground');
console.log('='.repeat(80));
console.log();

for (const expr of expressions) {
  console.log('─'.repeat(80));
  console.log('Expression:', expr.replace(/\n\s*/g, ' ').trim());
  console.log();

  // Validate
  const error = validate(expr);
  if (error) {
    console.log('❌ Validation Error:', error.message);
    console.log();
    continue;
  }

  try {
    // Parse
    const ast = parse(expr);
    console.log('AST:', JSON.stringify(ast, null, 2).split('\n').slice(0, 10).join('\n') + '...');
    console.log();

    // Generate JS
    const js = toJavaScript(expr, { wrapInFunction: false, pretty: true });
    console.log('Generated JS:');
    console.log('  ' + js.split('\n').join('\n  '));
    console.log();

    // Evaluate
    const result = evaluate(expr, testData);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.log('❌ Error:', (err as Error).message);
  }

  console.log();
}

// =============================================================================
// PERFORMANCE TEST
// =============================================================================

console.log('='.repeat(80));
console.log('Performance Test');
console.log('='.repeat(80));
console.log();

const perfExpr = 'orders[*].{ id, total: price * quantity }';
const iterations = 10000;

// Compile once
const compiledFn = compile(perfExpr);

// Warm up
for (let i = 0; i < 100; i++) {
  compiledFn(testData);
}

// Measure compiled execution
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  compiledFn(testData);
}
const compiledTime = performance.now() - start;

// Measure direct evaluation (includes parsing)
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  evaluate(perfExpr, testData);
}
const evalTime = performance.now() - start2;

console.log(`Expression: ${perfExpr}`);
console.log(`Iterations: ${iterations}`);
console.log(`Compiled execution: ${compiledTime.toFixed(2)}ms (${(iterations / compiledTime * 1000).toFixed(0)} ops/sec)`);
console.log(`With caching: ${evalTime.toFixed(2)}ms (${(iterations / evalTime * 1000).toFixed(0)} ops/sec)`);
console.log();

// =============================================================================
// STRICT MODE TEST - Enhanced Error Messages
// =============================================================================

console.log('='.repeat(80));
console.log('Strict Mode - Enhanced Error Messages');
console.log('='.repeat(80));
console.log();

const strictTests = [
  {
    name: 'Missing property',
    expr: 'user.nonexistent',
  },
  {
    name: 'Typo in property name (suggests similar)',
    expr: 'user.adress',  // Should suggest 'address'
  },
  {
    name: 'Null access',
    expr: 'user.nickname.length',
  },
  {
    name: 'Array index out of bounds',
    expr: 'orders[999]',
  },
  {
    name: 'Non-array spread',
    expr: 'user[*]',
  },
  {
    name: 'Nested missing property (with path)',
    expr: 'user.address.zipcode',
  },
];

for (const test of strictTests) {
  console.log(`─ ${test.name}`);
  console.log(`  Expression: ${test.expr}`);
  console.log();

  // Forgiving mode
  try {
    const result = evaluate(test.expr, testData, { strict: false });
    console.log(`  Forgiving mode: ${JSON.stringify(result)}`);
  } catch (err) {
    console.log(`  Forgiving mode error: ${(err as Error).message}`);
  }

  // Strict mode
  try {
    const result = evaluate(test.expr, testData, { strict: true });
    console.log(`  Strict mode: ${JSON.stringify(result)}`);
  } catch (err: any) {
    console.log(`  Strict mode error:`);
    console.log(`    Message: ${err.message}`);
    if (err.code) console.log(`    Code: ${err.code}`);
    if (err.path) console.log(`    Path: ${err.path}`);
    if (err.suggestions?.length) console.log(`    Did you mean: ${err.suggestions.join(', ')}?`);
  }

  console.log();
}

console.log('='.repeat(80));
console.log('Done!');
console.log('='.repeat(80));
