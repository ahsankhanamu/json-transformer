---
title: Operators
description: Reference for JSON Transformer operators.
sidebar:
  label: Operators
---

## Arithmetic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `5 + 3` → `8` |
| `-` | Subtraction | `5 - 3` → `2` |
| `*` | Multiplication | `5 * 3` → `15` |
| `/` | Division | `6 / 2` → `3` |
| `%` | Modulo | `7 % 3` → `1` |

## String Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&` | Concatenation | `"Hello" & " " & "World"` → `"Hello World"` |

The `&` operator is preferred for string concatenation as it's more explicit than `+`.

## Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal (loose) | `1 == "1"` → `true` |
| `!=` | Not equal (loose) | `1 != 2` → `true` |
| `===` | Equal (strict) | `1 === "1"` → `false` |
| `!==` | Not equal (strict) | `1 !== "1"` → `true` |
| `<` | Less than | `3 < 5` → `true` |
| `>` | Greater than | `5 > 3` → `true` |
| `<=` | Less or equal | `3 <= 3` → `true` |
| `>=` | Greater or equal | `3 >= 3` → `true` |

## Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&&` / `and` | Logical AND | `true && false` → `false` |
| `\|\|` / `or` | Logical OR | `true \|\| false` → `true` |
| `!` / `not` | Logical NOT | `!true` → `false` |

Both symbolic (`&&`, `||`, `!`) and keyword (`and`, `or`, `not`) forms are supported.

## Null Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `??` | Null coalescing | `null ?? "default"` → `"default"` |
| `?:` | Ternary | `cond ? "yes" : "no"` |

The null coalescing operator `??` returns the right operand when the left is `null` or `undefined`.

## Access Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `.` | Property access | `user.name` |
| `?.` | Optional chaining | `user?.address?.city` |
| `[]` | Index/computed access | `items[0]`, `obj["key"]` |
| `?[]` | Optional index | `items?.[0]` |
| `[*]` | Spread access | `orders[*].price` |
| `[?]` | Filter access | `orders[? .active]` |
| `[:]` | Slice access | `items[0:3]` |

### Spread Access `[*]` or `[]`

Returns the array for method chaining or projects a property from all items:

```javascript
orders[*]              // Returns the array
orders[]               // Shorthand for [*]
orders[].product       // Projects 'product' from all orders
```

### Filter Access `[?]`

Filters array items based on a condition:

```javascript
orders[? .price > 20]           // Items with price > 20
orders[? .status == "active"]   // Active items
orders[? $index > 0]            // All except first
```

### Slice Access `[:]`

Extracts a portion of an array:

```javascript
items[0:3]     // First 3 items (indices 0, 1, 2)
items[1:]      // All items from index 1
items[:2]      // First 2 items
items[-2:]     // Last 2 items
```

## Pipe Operator

| Operator | Description | Example |
|----------|-------------|---------|
| `\|` | Pipe | `name \| upper \| trim` |

Pipes the result of the left expression as the first argument to the right function:

```javascript
"  hello  " | trim | upper     // "HELLO"
orders | filter(x => x.active) | count
items | sort("price") | first
```

## Spread Operator

| Operator | Description | Example |
|----------|-------------|---------|
| `...` | Spread | `{ ...user, age: 30 }` |

Used in object and array literals to spread properties/elements:

```javascript
// Object spread
{ ...user, role: "admin" }

// Merging objects
{ ...defaults, ...overrides }
```

## Operator Precedence

From highest to lowest precedence:

1. Property access: `.` `?.` `[]` `?[]`
2. Unary: `!` `not` `-` (negation)
3. Multiplicative: `*` `/` `%`
4. Additive: `+` `-` `&`
5. Comparison: `<` `>` `<=` `>=`
6. Equality: `==` `!=` `===` `!==`
7. Logical AND: `&&` `and`
8. Logical OR: `||` `or`
9. Null coalescing: `??`
10. Ternary: `?:`
11. Pipe: `|`
12. Arrow: `=>`

Use parentheses to override precedence when needed:

```javascript
(a + b) * c
!(active && !deleted)
```
