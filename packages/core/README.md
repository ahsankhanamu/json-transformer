# @ahsankhanamu/json-transformer

A lightweight JSON query and transformation language that compiles to JavaScript.

## Installation

```bash
npm install @ahsankhanamu/json-transformer
```

## Tree-Shaking & Subpath Imports

For smaller bundles, import only what you need:

```javascript
// Full API (convenient)
import { evaluate, compile, toJS } from '@ahsankhanamu/json-transformer';

// Individual modules (tree-shakable)
import { parse, Parser } from '@ahsankhanamu/json-transformer/parser';
import { generate, NativeCodeGenerator } from '@ahsankhanamu/json-transformer/codegen';
import { helpers } from '@ahsankhanamu/json-transformer/runtime';
import * as AST from '@ahsankhanamu/json-transformer/ast';
```

## Quick Examples

```javascript
import { evaluate } from '@ahsankhanamu/json-transformer';

const data = {
  user: { name: 'John', age: 30 },
  orders: [
    { product: 'Widget', price: 25.99 },
    { product: 'Gadget', price: 49.99 }
  ]
};

// Property access
evaluate('user.name', data);                    // "John"

// Array operations
evaluate('orders[].product', data);             // ["Widget", "Gadget"]
evaluate('orders[? .price > 30]', data);        // Filter by price

// Transformations
evaluate('orders.map(x => x.price * 2)', data); // [51.98, 99.98]
evaluate('user.name | upper', data);            // "JOHN"
```

## API

```typescript
import { compile, evaluate, validate, toJS, parse } from '@ahsankhanamu/json-transformer';

// compile(expr, options?) - Returns reusable function (fastest for repeated use)
const fn = compile('user.name | upper');
fn({ user: { name: 'john' } }); // 'JOHN'

// evaluate(expr, data, options?) - One-shot evaluation with caching
evaluate('price * qty', { price: 10, qty: 5 }); // 50

// validate(expr) - Check syntax without executing
validate('user.name'); // null (valid)
validate('user.');     // ParseError

// toJS(expr, options?) - Generate JS source code
toJS('a + b'); // 'return (input?.a + input?.b);'

// parse(expr) - Get AST for inspection
parse('a.b'); // { type: 'Program', expression: { type: 'MemberAccess', ... } }
```

### Options

```typescript
interface Options {
  strict?: boolean;  // Throw errors vs return undefined (default: false)
  cache?: boolean;   // Cache compiled functions (default: true)
}
```

## Syntax

### Property Access
```javascript
user.firstName              // Simple access
user.address.city           // Nested access
user?.middleName            // Optional chaining
```

### Array Operations
```javascript
orders[0]                   // First element
orders[-1]                  // Last element
orders[].product            // Property projection → ["Widget", "Gadget"]
orders[0:3]                 // Slice
orders[? .price > 20]       // Filter
```

### Array Methods
```javascript
orders.map(x => x.price)           // Map
orders.filter(x => x.price > 20)   // Filter
orders.find(x => x.id == 1)        // Find
orders[].sort(.price)              // Sort
orders[].groupBy(.category)        // Group
```

### Pipe Operations
```javascript
name | upper | trim                           // Chain functions
orders.find(x => x.id === 3) | .status        // jq-style property access
"hello" | .toUpperCase()                      // Method calls
user | { name: .firstName, city: .address.city }  // Object construction
```

### Expressions
```javascript
price * quantity + tax              // Arithmetic
firstName & " " & lastName          // String concatenation
`Hello ${user.name}!`               // Template literals
age >= 18 ? "Adult" : "Minor"       // Ternary
nickname ?? "Anonymous"             // Null coalescing
```

### Object Construction
```javascript
{ name: user.firstName, city: user.address.city }
{ ...user, fullName: firstName & " " & lastName }
```

### Variable Bindings
```javascript
let total = price * qty;
let tax = total * 0.1;
{ subtotal: total, tax, total: total + tax }
```

## Built-in Functions

| Category | Functions |
|----------|-----------|
| String | `upper`, `lower`, `trim`, `split`, `join`, `replace`, `substring`, `contains`, `capitalize`, `camelCase`, `snakeCase`, `kebabCase` |
| Math | `round`, `floor`, `ceil`, `abs`, `min`, `max`, `clamp` |
| Array | `sum`, `avg`, `count`, `first`, `last`, `unique`, `flatten`, `reverse`, `sort`, `groupBy`, `keyBy`, `take`, `drop` |
| Object | `keys`, `values`, `entries`, `pick`, `omit`, `merge`, `get`, `set` |
| Type | `type`, `isString`, `isNumber`, `isArray`, `isObject`, `isEmpty` |
| Conversion | `toString`, `toNumber`, `toJSON`, `fromJSON` |

## Code Generation Modes

**Forgiving Mode** (default) - Returns undefined for missing paths:
```javascript
toJS('user.address.city');
// → input?.user?.address?.city
```

**Strict Mode** - Throws descriptive errors:
```javascript
toJS('user.address.city', { strict: true });
// Throws: "Property 'city' does not exist at path 'user.address'"
```

## Links

- [Documentation](https://json-transformer-docs.vercel.app)
- [Playground](https://json-transformer-docs.vercel.app/playground)
- [GitHub](https://github.com/ahsankhanamu/json-transformer)

## License

MIT
