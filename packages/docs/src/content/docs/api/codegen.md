---
title: Code Generation
description: Generate JavaScript code from JSON Transformer expressions.
sidebar:
  label: Code Generation
---

JSON Transformer can generate standalone JavaScript code from expressions. This is useful for:

- Inspecting what code will run
- Pre-compiling for performance
- Using expressions in environments without the runtime

## Basic Usage

```typescript
import { toJavaScript } from '@ahsankhanamu/json-transformer';

toJavaScript('user.name');
// "return input?.user?.name;"

toJavaScript('price * qty');
// "return (input?.price * input?.qty);"

toJavaScript('items | sum');
// "return __helpers.sum(input?.items);"
```

## Options

### pretty

Format the output for readability:

```typescript
toJavaScript('a + b', { pretty: true });
// "return (input?.a + input?.b);"
```

### wrapInFunction

Wrap output in a function declaration:

```typescript
toJavaScript('user.name', {
  wrapInFunction: true,
  functionName: 'getName'
});
// "function getName(input) {\n  return input?.user?.name;\n}"
```

### strict

Generate code that throws on missing properties:

```typescript
toJavaScript('user.name', { strict: true });
// Generates code with runtime property validation
```

### native

Generate native JavaScript without helper function dependencies:

```typescript
toJavaScript('items | sum', { native: false });
// "return __helpers.sum(input?.items);"

toJavaScript('items | sum', { native: true });
// "return input?.items?.reduce((a, b) => a + b, 0);"
```

## Generated Code Structure

### Property Access

```javascript
// Expression: user.address.city
// Forgiving mode:
input?.user?.address?.city

// Strict mode:
(() => {
  if (!input?.user) throw new Error("Property 'user' does not exist");
  if (!input.user?.address) throw new Error("Property 'address' does not exist at 'user'");
  return input.user.address.city;
})()
```

### Array Operations

```javascript
// Expression: orders[].price
(input?.orders ?? []).map(item => item?.price)

// Expression: orders[? .price > 20]
(input?.orders ?? []).filter(item => item?.price > 20)

// Expression: orders[0:3]
(input?.orders ?? []).slice(0, 3)
```

### Functions and Pipes

```javascript
// Expression: name | upper | trim
__helpers.trim(__helpers.upper(input?.name))

// With native: true
(input?.name ?? '').toUpperCase().trim()
```

### Object Construction

```javascript
// Expression: { fullName: firstName & " " & lastName }
({
  fullName: ((input?.firstName ?? '') + " " + (input?.lastName ?? ''))
})
```

### Arrow Functions

```javascript
// Expression: items.map(x => x.price * 2)
(input?.items ?? []).map((x) => (x?.price * 2))
```

## Helpers Reference

When `native: false` (default), generated code uses `__helpers`:

| Helper | Description |
|--------|-------------|
| `__helpers.upper(str)` | Uppercase string |
| `__helpers.lower(str)` | Lowercase string |
| `__helpers.trim(str)` | Trim whitespace |
| `__helpers.sum(arr)` | Sum array values |
| `__helpers.avg(arr)` | Average array values |
| `__helpers.sort(arr, key)` | Sort by key |
| `__helpers.groupBy(arr, key)` | Group by key |
| ... | See runtime.ts for full list |

## Use Cases

### Pre-compilation

```typescript
// Build time
const code = toJavaScript('user.name | upper', {
  wrapInFunction: true,
  functionName: 'transform'
});
fs.writeFileSync('generated.js', code);

// Runtime (no JSON Transformer dependency needed)
const result = transform({ user: { name: 'john' } });
```

### Debugging

```typescript
// Inspect what code will run
console.log(toJavaScript('complex.expression.here', { pretty: true }));
```

### Code Review

Generate code for expressions in configuration files for security review:

```typescript
const expressions = loadConfigExpressions();
for (const expr of expressions) {
  console.log(`// ${expr}`);
  console.log(toJavaScript(expr, { pretty: true }));
}
```
