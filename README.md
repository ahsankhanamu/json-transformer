# JSON Transformer

A lightweight JSON query and transformation language that compiles to JavaScript.

## Getting Started

```bash
git clone https://github.com/ahsankhanamu/json-transformer
cd json-transformer
npm install
npm test
```

## Supported Tokens

| Category | Tokens |
|----------|--------|
| Literals | Numbers, strings, template literals, booleans, null |
| Operators | `+` `-` `*` `/` `%` `&` (concat) |
| Comparison | `==` `!=` `===` `!==` `<` `>` `<=` `>=` |
| Logical | `&&` `||` `!` `and` `or` `not` |
| Access | `.` `?.` `[]` `?[]` `[*]` `[?]` |
| Other | `??` `?:` `=>` `|` (pipe) `...` (spread) |

## Architecture

```
Expression String → [Lexer] → Tokens → [Parser] → AST
```

The lexer tokenizes input strings, the parser builds an AST using recursive descent.

## Syntax

### Property Access
```
user.firstName              // Simple access
user.address.city           // Nested access
user?.middleName            // Optional chaining
```

### Array Operations
```
orders[0]                   // Index access
orders[-1]                  // Last element
orders[0:3]                 // Slice
orders[*].product           // Map to property
orders[? status == "active"] // Filter
```

### Expressions
```
// Arithmetic
price * quantity + tax

// String concatenation
firstName & " " & lastName

// Template literals
`Hello ${user.name}!`

// Ternary
age >= 18 ? "Adult" : "Minor"

// Null coalescing
nickname ?? firstName ?? "Anonymous"

// Logical
isActive && !isDeleted
```

### Object Construction
```
{ name: user.firstName, city: user.address.city }
```

### Variable Bindings
```
let total = price * qty;
let tax = total * 0.1;
{ subtotal: total, tax, total: total + tax }
```

### Pipe Operations
```
name | upper | trim
items | filter(x => x.active) | count
```

## Built-in Functions

| Category | Functions |
|----------|-----------|
| String | `upper`, `lower`, `trim`, `split`, `join`, `replace`, `substring` |
| Math | `round`, `floor`, `ceil`, `abs`, `min`, `max`, `sum`, `avg` |
| Array | `count`, `first`, `last`, `unique`, `flatten`, `sort`, `reverse`, `filter`, `map`, `find` |
| Object | `keys`, `values`, `entries`, `pick`, `omit`, `merge` |
| Type | `type`, `isString`, `isNumber`, `isArray`, `isObject`, `isEmpty` |
| Conversion | `toString`, `toNumber`, `toArray`, `toBoolean` |
| Utility | `coalesce`, `default`, `if`, `uuid` |

## Code Generation

The code generator converts AST to JavaScript with two modes:

**Forgiving Mode** (default) - Uses optional chaining, returns undefined for missing paths:
```javascript
// Input: user.address.city
// Output: input?.user?.address?.city
```

**Strict Mode** - Validates at runtime, throws descriptive errors:
```javascript
// Input: user.address.city
// Output: __helpers.strictGet(__helpers.strictGet(input, "user", ""), "address", "user")
// Throws: "Property 'city' does not exist on object at path 'user.address'"
```

## API

```typescript
import { compile, evaluate, validate, toJavaScript, parse } from 'mapql';

// compile(expr, options?) - Returns reusable function (fastest for repeated use)
const fn = compile('user.name | upper');
fn({ user: { name: 'john' } }); // 'JOHN'

// evaluate(expr, data, options?) - One-shot evaluation with caching
evaluate('price * qty', { price: 10, qty: 5 }); // 50

// validate(expr) - Check syntax without executing
validate('user.name'); // null (valid)
validate('user.');     // ParseError

// toJavaScript(expr, options?) - Generate JS source code
toJavaScript('a + b'); // 'return (input?.a + input?.b);'

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

## Testing

```bash
npm test
```

Test coverage includes:
- Property access (simple, nested, missing, optional)
- Array operations (index, slice, spread, filter)
- Arithmetic with operator precedence
- String concatenation and template literals
- Logical operations and null handling
- Pipe operations and object construction
- Strict mode error messages with suggestions

## Playground

Interactive testing with all expression types:

```bash
npx tsx src/playground.ts
```

Includes performance benchmarks showing ~6 million ops/sec for compiled expressions.

## License

MIT
