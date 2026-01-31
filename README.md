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
