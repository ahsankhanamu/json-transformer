---
title: Expressions
description: Complete reference for JSON Transformer expression syntax.
---

# Expression Syntax

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

```javascript
name | upper | trim
orders | sort("price") | first
items | filter(x => x.active) | count
```
