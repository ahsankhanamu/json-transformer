---
title: JavaScript API
description: Reference for the JSON Transformer JavaScript API.
sidebar:
  label: JavaScript API
---

## Installation

```bash
npm install @ahsankhanamu/json-transformer
```

## Functions

### evaluate(data, expression, options?)

Evaluates an expression against data. Compiled functions are cached for performance.

```typescript
import { evaluate } from '@ahsankhanamu/json-transformer';

// Data first, expression second
evaluate({ user: { name: 'John' } }, 'user.name');
// "John"

evaluate({ price: 10, qty: 5 }, 'price * qty');
// 50

evaluate({ items: [1, 2, 3] }, 'items | sum');
// 6
```

### compile(expression, options?)

Compiles an expression into a reusable function. Best for expressions that will be evaluated multiple times.

```typescript
import { compile } from '@ahsankhanamu/json-transformer';

const getFullName = compile('firstName & " " & lastName');

getFullName({ firstName: 'John', lastName: 'Doe' });
// "John Doe"

getFullName({ firstName: 'Jane', lastName: 'Smith' });
// "Jane Smith"
```

### toJS(expression, options?)

Generates JavaScript source code from an expression.

```typescript
import { toJS } from '@ahsankhanamu/json-transformer';

toJS('a + b');
// "function transform(input) { return input?.a + input?.b; }"

toJS('items | sum');
// "function transform(input) { return __helpers.sum(input?.items); }"

// Native JS (no helpers)
toJS('orders | sort(.price)', { native: true });
// "function transform(input) { return [...(input?.orders ?? [])].sort((a, b) => a.price - b.price); }"
```

### validate(expression)

Validates expression syntax without executing. Returns `null` if valid, or a `ParseError` if invalid.

```typescript
import { validate } from '@ahsankhanamu/json-transformer';

validate('user.name');
// null (valid)

validate('user.');
// ParseError: Unexpected end of expression
```

### parse(expression)

Parses an expression and returns the AST (Abstract Syntax Tree).

```typescript
import { parse } from '@ahsankhanamu/json-transformer';

parse('a + b');
// {
//   type: 'Program',
//   expression: {
//     type: 'BinaryExpression',
//     operator: '+',
//     left: { type: 'Identifier', name: 'a' },
//     right: { type: 'Identifier', name: 'b' }
//   }
// }
```

## Options

```typescript
interface EvaluateOptions {
  strict?: boolean;  // Throw errors vs return undefined (default: false)
  bindings?: Record<string, unknown>;  // External bindings
}

interface CompileOptions {
  strict?: boolean;  // Throw errors vs return undefined (default: false)
  cache?: boolean;   // Cache compiled functions (default: true)
}

interface CodeGenOptions {
  strict?: boolean;       // Generate strict mode code (default: false)
  wrapInFunction?: boolean;  // Wrap in function declaration (default: true)
  functionName?: string;  // Name for wrapped function (default: "transform")
  native?: boolean;       // Generate native JS without helpers (default: false)
}
```

## Modes

### Forgiving Mode (default)

Uses optional chaining, returns `undefined` for missing paths:

```typescript
evaluate({ user: {} }, 'user.address.city');
// undefined (no error)

evaluate({ items: [] }, 'items[0].name');
// undefined (no error)
```

### Strict Mode

Validates at runtime, throws descriptive errors:

```typescript
evaluate({ user: {} }, 'user.address.city', { strict: true });
// Error: Property 'address' does not exist at path 'user'

evaluate({ user: { name: 'John' } }, 'usr.name', { strict: true });
// Error: Property 'usr' does not exist. Did you mean: user?
```

Strict mode includes typo suggestions for property names.

## Error Handling

```typescript
import { evaluate, validate, ParseError } from '@ahsankhanamu/json-transformer';

// Syntax validation
const error = validate('invalid.');
if (error) {
  console.error(error.message);
  // "Unexpected end of expression at position 8"
}

// Runtime errors (strict mode)
try {
  evaluate({}, 'missing.path', { strict: true });
} catch (e) {
  console.error(e.message);
  // "Property 'missing' does not exist at path 'root'"
}
```

## TypeScript Support

The library includes TypeScript definitions:

```typescript
import { evaluate, compile } from '@ahsankhanamu/json-transformer';

interface User {
  name: string;
  age: number;
}

const data: { user: User } = {
  user: { name: 'John', age: 30 }
};

const result = evaluate(data, 'user.name');
// Type: unknown (runtime determined)

const getName = compile('user.name');
const name = getName(data);
// Type: unknown
```
