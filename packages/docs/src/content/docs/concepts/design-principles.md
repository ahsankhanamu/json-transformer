---
title: Design Principles
description: Core design principles behind JSON Transformer's code generation and runtime behavior.
---

JSON Transformer follows several key principles that guide its code generation and runtime behavior. Understanding these helps explain why the generated code looks the way it does.

## Immutability

**The transform function never mutates input data.**

This is the most important principle. Like MongoDB aggregation pipelines, React state updates, and functional programming patterns, JSON Transformer treats input as read-only.

### Why Immutability Matters

```javascript
// BAD: Mutating sort
input.orders.sort((a, b) => a.price - b.price)
// Now input.orders is permanently reordered!
// Calling transform again gives different results
```

```javascript
// GOOD: Non-mutating sort (what we generate)
[...input.orders].sort((a, b) => a.price - b.price)
// input.orders stays in original order
// Transform is pure - same input always gives same output
```

### Benefits

| Benefit | Description |
|---------|-------------|
| **Predictable** | Same input always produces same output |
| **Debuggable** | Original data preserved for inspection |
| **Safe** | No side effects, no race conditions |
| **Composable** | Multiple transforms can share input |
| **Testable** | Easy to write unit tests |

### How MongoDB Does It

In MongoDB's aggregation pipeline, each stage receives documents and passes transformed results to the next stage. The source collection is never modified:

```javascript
// MongoDB - original collection unchanged
db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $sort: { price: 1 } },
  { $project: { product: 1, price: 1 } }
])
```

JSON Transformer follows the same pattern:

```javascript
// JSON Transformer - original input unchanged
orders[? status === "shipped"] | sort(.price) | { product, price }
```

### JavaScript Methods That Mutate

These array methods mutate the original array:
- `sort()` - reorders in place
- `reverse()` - reverses in place
- `splice()` - modifies in place
- `push()` / `pop()` - adds/removes elements

### ES2023 Non-Mutating Methods

JSON Transformer uses ES2023's immutable array methods:
- `toSorted()` - returns new sorted array
- `toReversed()` - returns new reversed array
- `toSpliced()` - returns new spliced array

```javascript
// Generated code for: orders | sort(.price)
(input?.orders ?? []).toSorted((a, b) => a.price - b.price)
```

These methods are cleaner than the spread pattern (`[...arr].sort()`) and explicitly signal immutability intent. Requires Node.js 20+ or modern browsers (Chrome 110+, Firefox 115+, Safari 16+).

---

## Null Safety

**Access to missing properties returns `undefined`, not errors.**

JSON Transformer uses optional chaining (`?.`) by default to handle missing or null values gracefully.

### Forgiving Mode (Default)

```javascript
// Expression
user.address.city

// Generated code
input?.user?.address?.city

// Result when address is missing: undefined (not an error)
```

### Strict Mode

For cases where you want explicit errors on missing data:

```javascript
// With strict: true option
const result = evaluate('user.address.city', input, { strict: true });
// Throws: "Cannot access 'city' on undefined at path 'user.address'"
```

---

## Null Coalescing for Arrays

**Array operations always have a fallback empty array.**

When accessing arrays that might be null/undefined, we use `?? []` to ensure array methods don't throw:

```javascript
// Expression
orders[].map(x => x.price)

// Generated code
(input?.orders ?? []).map(x => x?.price)

// If orders is undefined, returns [] instead of throwing
```

---

## Pure Functions

**Transform functions have no side effects.**

The generated `transform(input)` function:
- Only reads from `input`
- Never modifies `input`
- Never accesses external state
- Always returns the same output for the same input

This makes transforms:
- Safe to cache
- Safe to run in parallel
- Safe to retry on failure
- Easy to test and debug

---

## Readable Output

**Generated code should be human-readable.**

The "Standalone JS" output is designed to be copy-pasted and understood:

```javascript
// Expression
orders | sort(.price)

// Generated standalone JS
function transform(input, bindings = {}) {
  return [...(input?.orders ?? [])].sort((a, b) => a.price - b.price);
}
```

We prioritize clarity over brevity. The code should be self-documenting and easy to modify if needed.
