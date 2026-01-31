# JSON Transformer

A lightweight JSON query and transformation language that compiles to JavaScript.

## Getting Started

```bash
git clone https://github.com/ahsankhanamu/json-transformer
cd json-transformer
npm install
npm run build
npm test
```

## Monorepo Structure

```
json-transformer/
├── packages/
│   ├── core/        # @ahsankhanamu/json-transformer - The library
│   ├── playground/  # json-transformer-playground - Web app
│   └── docs/        # json-transformer-docs - Documentation (Starlight)
├── package.json     # Workspace root
└── tsconfig.base.json
```

## Quick Examples

```javascript
import { evaluate } from '@ahsankhanamu/json-transformer';

const data = {
  user: { name: 'John', age: 30 },
  orders: [
    { product: 'Widget', price: 25.99, meta: { priority: 2 } },
    { product: 'Gadget', price: 49.99, meta: { priority: 1 } }
  ]
};

// Property access
evaluate('user.name', data);                    // "John"

// Array operations
evaluate('orders[].product', data);             // ["Widget", "Gadget"]
evaluate('orders[].sort(.price)', data);        // Sorted by price
evaluate('orders[? .price > 30]', data);        // Filter by price

// Transformations
evaluate('orders.map(x => x.price * 2)', data); // [51.98, 99.98]
evaluate('user.name | upper', data);            // "JOHN"
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
Expression String → [Lexer] → Tokens → [Parser] → AST → [CodeGen] → JavaScript
```

## Syntax

### Property Access
```javascript
user.firstName              // Simple access
user.address.city           // Nested access
user?.middleName            // Optional chaining
```

### Array Operations

#### Index Access
```javascript
orders[0]                   // First element
orders[-1]                  // Last element
orders[1].product           // Property of second element
```

#### Spread Access `[*]` or `[]`
```javascript
orders[*]                   // Returns the array (for method chaining)
orders[]                    // Shorthand for [*]
```

#### Property Projection
```javascript
orders[].product            // → ["Widget", "Gadget", "Gizmo"]
orders[*].price             // → [25.99, 49.99, 15.00]
```

#### Slice Access
```javascript
orders[0:3]                 // First three elements
orders[1:]                  // All except first
orders[:2]                  // First two
orders[-2:]                 // Last two
```

#### Filter Access
```javascript
orders[? .status == "shipped"]     // Filter by condition
orders[? .price > 20]              // Filter by price
orders[? $index > 0]               // Skip first item
```

### Sorting and Grouping

**Three equivalent syntaxes** for specifying property keys:

```javascript
// Dot-prefix (recommended - clearest intent)
orders[].sort(.price)
orders[].sort(.meta.priority)

// Bare identifier (relaxed)
orders[].sort(price)
orders[].sort(meta.priority)

// Quoted string
orders[].sort("price")
orders[].sort("meta.priority")
```

**Available methods:**
```javascript
orders[].sort(.price)              // Sort ascending
orders[].sortDesc(.price)          // Sort descending
orders[].groupBy(.category)        // Group by property
orders[].keyBy(.id)                // Index by property
```

**Arrow functions for full control:**
```javascript
orders[].sort(x => x.price)                    // Extractor function
orders.sort((a, b) => a.price - b.price)       // Comparator function
orders.toSorted((a, b) => b.price - a.price)   // Non-mutating
```

### Array Methods (JS-style)

Standard JavaScript array methods with arrow functions:

```javascript
orders.map(x => x.price)                    // Map to prices
orders.filter(x => x.price > 20)            // Filter by price
orders.find(x => x.id == 1)                 // Find by id
orders.map((item, i) => `${i}: ${item.product}`)  // With index
orders.filter((x, idx, arr) => idx < arr.length - 1)  // With array ref
```

### Context Variables (in `[*]` and `[?]`)

When using spread/filter iteration, these context variables are available:

| Variable | Description |
|----------|-------------|
| `.` or `$item` | Current item being processed |
| `$index` or `$i` | Current index (0-based) |
| `$array` | Reference to the array being iterated |
| `$length` | Length of the array |
| `$first` | `true` if first item (`$index == 0`) |
| `$last` | `true` if last item (`$index == $length - 1`) |

**Examples:**
```javascript
// Filter by position
orders[? $index > 0]                 // Skip first
orders[? $first || $last]            // First and last only
orders[? !$first && !$last]          // Middle items only

// Access array metadata
orders[? $index < $length - 1]       // All but last

// Access siblings
orders[*].{
  current: product,
  next: $array[$index + 1]?.product ?? "none"
}
```

### Expressions
```javascript
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
```javascript
{ name: user.firstName, city: user.address.city }

// With spread
{ ...user, fullName: user.firstName & " " & user.lastName }

// Shorthand
{ firstName, lastName, age }
```

### Variable Bindings
```javascript
let total = price * qty;
let tax = total * 0.1;
{ subtotal: total, tax, total: total + tax }
```

### Pipe Operations

Basic piping passes values through functions:
```javascript
name | upper | trim
orders | sort("price") | first
items | filter(x => x.active) | count
```

#### jq-style Property Access

Access properties directly on piped values using `.` prefix (inspired by jq):

```javascript
// Property access on pipe value
orders.find(x => x.id === 3) | .status       // "shipped"
user | .address | .city                       // "New York"

// Index access
[1, 2, 3] | .[1]                             // 2
orders | .[0] | .product                      // "Widget"

// Method calls on pipe value
"hello" | .toUpperCase()                      // "HELLO"
"hello world" | .split(" ") | .[0]            // "hello"

// Chain with function pipes
user | .firstName | upper                     // "JOHN"
"  hello  " | trim | .toUpperCase()           // "HELLO"

// Index access without dot (also works)
[1, 2, 3] | [1]                              // 2
```

#### Function Pipes with Index/Slice Access

Call functions in pipes and immediately access results:
```javascript
"a,b,c" | split(",")[1]                      // "b"
[1,2,3,4,5] | take(4)[1:3]                   // [2, 3]
orders.find(x => x.id === 1) | .status | split(" ")[0]  // "shipped"
```

#### Pipe to Object Construction

Reshape data by piping to object literals. Use `.` to reference piped value:

```javascript
// Create new object from piped value
orders[0] | { id: .id, name: .product }
// → { id: 1, name: "Widget" }

// Spread piped value and add/override properties
orders[0] | { ..., extra: "new" }
// → { id: 1, product: "Widget", price: 25.99, ..., extra: "new" }

// Nested pipes within object construction
orders[0] | { id: .id, upper: .status | upper }
// → { id: 1, upper: "SHIPPED" }

// Arithmetic on piped properties
orders[0] | { doubled: .price * 2 }
// → { doubled: 51.98 }
```

**Inside pipe object construction:**
- `.field` accesses properties on the piped value
- `...` spreads the piped value (bare spread, no object prefix needed)
- Expressions can use `.` references mixed with literals and operations

#### Pipe to Array Construction

Extract values into arrays using pipe-to-array:

```javascript
// Shorthand: identifier becomes .identifier on pipe value
orders[0] | [id, product, price]
// → [1, "Widget", 25.99]

// Explicit dot syntax
orders[0] | [.id, .product]
// → [1, "Widget"]

// Empty array
orders[0] | []
// → []

// Mixed with expressions
orders[0] | [.id, .price * 2, "constant"]
// → [1, 51.98, "constant"]
```

**Note:** `| [0]` is still index access (single number), while `| [id]` or `| [.id]` is array construction.

## Built-in Functions

| Category | Functions |
|----------|-----------|
| String | `upper`, `lower`, `trim`, `split`, `join`, `replace`, `replaceAll`, `substring`, `startsWith`, `endsWith`, `contains`, `padStart`, `padEnd`, `capitalize`, `camelCase`, `snakeCase`, `kebabCase`, `matches` |
| Math | `round`, `floor`, `ceil`, `abs`, `min`, `max`, `clamp`, `random`, `randomInt` |
| Array | `sum`, `avg`, `count`, `first`, `last`, `unique`, `flatten`, `reverse`, `sort`, `sortDesc`, `groupBy`, `keyBy`, `zip`, `compact`, `take`, `drop`, `range` |
| Object | `keys`, `values`, `entries`, `pick`, `omit`, `merge`, `get`, `set` |
| Type | `type`, `isString`, `isNumber`, `isBoolean`, `isArray`, `isObject`, `isNull`, `isUndefined`, `isEmpty` |
| Conversion | `toString`, `toNumber`, `toBoolean`, `toArray`, `toJSON`, `fromJSON` |
| Date | `now`, `today`, `formatDate`, `parseDate` |
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
// Throws: "Property 'city' does not exist at path 'user.address'"
// Includes suggestions for typos: "Did you mean: country?"
```

## API

```typescript
import { compile, evaluate, validate, toJavaScript, parse } from '@ahsankhanamu/json-transformer';

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

## Playground

Interactive web playground:

```bash
npm run dev  # Starts playground on localhost:5173
```

Or CLI playground:

```bash
npx tsx packages/core/src/playground.ts
```

## Testing

```bash
npm test
```

## License

MIT
