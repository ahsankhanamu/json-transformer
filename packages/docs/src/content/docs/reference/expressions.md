---
title: Expression Syntax
description: Complete reference for JSON Transformer expression syntax.
sidebar:
  label: Expressions
---

## Property Access

```javascript
user.firstName              // Simple access
user.address.city           // Nested access
user?.middleName            // Optional chaining
```

## Array Operations

### Index Access

```javascript
orders[0]                   // First element
orders[-1]                  // Last element
orders[1].product           // Property of second element
```

### Spread Access

```javascript
orders[*]                   // Returns the array (for method chaining)
orders[]                    // Shorthand for [*]
```

### Property Projection

```javascript
orders[].product            // → ["Widget", "Gadget", "Gizmo"]
orders[*].price             // → [25.99, 49.99, 15.00]
```

### Slice Access

```javascript
orders[0:3]                 // First three elements
orders[1:]                  // All except first
orders[:2]                  // First two
orders[-2:]                 // Last two
```

### Filter Access

```javascript
orders[? .status == "shipped"]     // Filter by condition
orders[? .price > 20]              // Filter by price
orders[? $index > 0]               // Skip first item
```

### Automatic Property Projection

Property access after array operations (filter, slice, spread) automatically maps to extract that property from each element:

```javascript
// Filter + property
orders[? status == "shipped"].product      // → ["Widget", "Gizmo"]

// Slice + property
orders[0:2].product                        // → ["Widget", "Gadget"]

// Spread + property (already supported)
orders[].product                           // → ["Widget", "Gadget", "Gizmo"]

// Chained property access also works:
items[? active].info.name                  // → nested property from each filtered item
items[0:2].info.name                       // → nested property from each sliced item
```

This is equivalent to but more concise than:
```javascript
orders[? status == "shipped"][].product    // Explicit spread
```

## Context Variables

When using JSON Transformer-style iteration (`[*]` and `[?]`), these context variables are available:

| Variable | Description |
|----------|-------------|
| `.` or `$item` | Current item being processed |
| `$index` or `$i` | Current index (0-based) |
| `$array` | Reference to the array being iterated |
| `$length` | Length of the array |
| `$first` | `true` if first item |
| `$last` | `true` if last item |

**Examples:**

```javascript
// Filter by position
orders[? $index > 0]                 // Skip first
orders[? $first || $last]            // First and last only
orders[? !$first && !$last]          // Middle items only

// Access array metadata
orders[? $index < $length - 1]       // All but last
```

## Sorting and Grouping

Three equivalent syntaxes for specifying property keys:

```javascript
// Dot-prefix (recommended)
orders[].sort(.price)
orders[].sort(.meta.priority)

// Bare identifier
orders[].sort(price)

// Quoted string
orders[].sort("price")
```

**Available methods:**

```javascript
orders[].sort(.price)              // Sort ascending
orders[].sortDesc(.price)          // Sort descending
orders[].groupBy(.category)        // Group by property
orders[].keyBy(.id)                // Index by property
```

## Arrow Functions

```javascript
orders.map(x => x.price)                    // Single param
orders.filter(x => x.price > 20)            // With condition
orders.map((item, i) => `${i}: ${item.name}`)  // With index
orders.sort((a, b) => a.price - b.price)    // Comparator
```

### Implicit Property Access

Inside arrow function bodies, `.property` automatically resolves to `param.property`:

```javascript
// These are equivalent:
orders.filter(x => x.price > 20)
orders.filter(x => .price > 20)

// Implicit access works with all arrow expressions:
orders.map(o => .product)                   // → ["Widget", "Gadget", "Gizmo"]
orders.find(o => .status === "shipped")     // → first shipped order
orders.filter(o => .price > 20).map(o => .product)  // Chain with implicit access

// Works with index access too:
arrays.map(a => .[0])                       // First element of each array

// Works with method calls:
tags.map(t => .toUpperCase())               // → ["ELECTRONICS", "SALE", "FEATURED"]

// Nested property access:
items.map(i => .info.name)                  // → nested property from each item
```

This provides a concise syntax similar to the filter predicate (`[? .price > 20]`) but for native JavaScript array methods.

## Expressions

### Arithmetic

```javascript
price * quantity + tax
(price + shipping) * 1.1
```

### String Concatenation

```javascript
firstName & " " & lastName
```

### Template Literals

```javascript
`Hello ${user.name}!`
`${count} items totaling $${total}`
```

### Ternary

```javascript
age >= 18 ? "Adult" : "Minor"
status == "active" ? item : null
```

### Null Coalescing

```javascript
nickname ?? firstName ?? "Anonymous"
```

### Logical

```javascript
isActive && !isDeleted
status == "active" or status == "pending"
```

## Object Construction

```javascript
{ name: user.firstName, city: user.address.city }

// With spread
{ ...user, fullName: user.firstName & " " & user.lastName }

// Shorthand
{ firstName, lastName, age }
```

## Variable Bindings

```javascript
let total = price * qty;
let tax = total * 0.1;
{ subtotal: total, tax, total: total + tax }
```

## Pipe Operations

The pipe operator (`|`) chains transformations, passing the result of the left side to the right side.

### Helper Function Pipes

```javascript
name | upper | trim
orders | sort("price") | first
items | filter(x => x.active) | count
```

### Property Access Pipes (jq-style)

Access properties directly on the piped value using dot syntax:

| Syntax | Description | Example |
|--------|-------------|---------|
| `val \| .field` | Access property | `user \| .name` → `"John"` |
| `val \| .[0]` | Access index | `[1,2,3] \| .[1]` → `2` |
| `val \| .["key"]` | Dynamic key access | `obj \| .[fieldName]` |
| `val \| .method()` | Call method | `"hello" \| .toUpperCase()` → `"HELLO"` |
| `val \| .a.b.c` | Chain property access | `user \| .address.city` |

**Examples:**

```javascript
// Find and access property
orders.find(x => x.id === 3) | .status      // → "shipped"

// Chain multiple property accesses
{ items: [{ x: 1 }] } | .items | .[0] | .x  // → 1

// Call methods on piped value
"hello" | .split("") | .[0]                 // → "h"
"  hello  " | trim | .toUpperCase()         // → "HELLO"
```

### Pipe to Object Construction

Transform a value into an object, referencing the piped value with `.field`:

```javascript
user | { name: .firstName, city: .address.city }

// With spread
user | { ..., fullName: .firstName & " " & .lastName }

// Shorthand (equivalent to { id: .id, name: .name })
user | { id, name }
```

### Pipe to Array Construction

Transform a value into an array:

```javascript
user | [.id, .name, .email]

// Shorthand
user | [id, name, email]
```

### Pipe Spread and Map

Spread a piped array with `| [*]` and optionally map each element with `.{ }`:

```javascript
// Spread and map to objects
items | groupBy(category) | entries() | [*].{ key: .[0], items: .[1] }

// Chain [*] directly on a piped function call
items | groupBy(category) | entries()[*].{ key: .[0], items: .[1] }

// Spread and access a property from each element
items | [*].name
```

Inside `[*].{ }`, the dot (`.`) refers to the **current item** being mapped, not the pipe context. This is the same behavior as the regular `array[*].{ }` syntax.

:::note
`| []` (empty brackets) creates an empty array — it does **not** spread. Use `| [*]` for spreading in pipe chains.
:::

### Generated Code

Pipe expressions generate clean, readable JavaScript:

```javascript
// Expression: orders.find(x => x.id === 3) | .status
function transform(input) {
  let _pipe = input?.orders?.find((x) => x?.id === 3);
  return _pipe?.status;
}

// Expression: "hello" | .split("") | .[0]
function transform(input) {
  let _pipe = "hello";
  _pipe = _pipe?.split("");
  return _pipe?.[0];
}

// Expression: items | [*].name
function transform(input) {
  let _pipe = input?.items;
  return (_pipe ?? []).map((item) => item?.name);
}
```
