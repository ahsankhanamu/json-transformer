---
title: JavaScript API
description: Reference for the JSON Transformer JavaScript API.
---

# JavaScript API

## Installation

```bash
npm install @ahsankhanamu/json-transformer
```

## Functions

### evaluate(expression, data, options?)

Evaluates an expression against data. Compiled functions are cached for performance.

```typescript
import { evaluate } from '@ahsankhanamu/json-transformer';

evaluate('user.name', { user: { name: 'John' } });
// "John"

evaluate('price * qty', { price: 10, qty: 5 });
// 50

evaluate('items | sum', { items: [1, 2, 3] });
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

### toJavaScript(expression, options?)

Generates JavaScript source code from an expression.

```typescript
import { toJavaScript } from '@ahsankhanamu/json-transformer';

toJavaScript('a + b');
// "return (input?.a + input?.b);"

toJavaScript('items | sum', { pretty: true });
// "return __helpers.sum(input?.items);"
```

## Options

```typescript
interface EvaluateOptions {
  strict?: boolean;  // Throw errors vs return undefined (default: false)
  cache?: boolean;   // Cache compiled functions (default: true)
}

interface CompileOptions {
  strict?: boolean;  // Throw errors vs return undefined (default: false)
}

interface CodeGenOptions {
  strict?: boolean;       // Generate strict mode code (default: false)
  pretty?: boolean;       // Format output (default: false)
  wrapInFunction?: boolean;  // Wrap in function declaration
  functionName?: string;  // Name for wrapped function
  native?: boolean;       // Generate native JS without helpers
}
```

## Modes

### Forgiving Mode (default)

Uses optional chaining, returns `undefined` for missing paths:

```typescript
evaluate('user.address.city', { user: {} });
// undefined (no error)

evaluate('items[0].name', { items: [] });
// undefined (no error)
```

### Strict Mode

Validates at runtime, throws descriptive errors:

```typescript
evaluate('user.address.city', { user: {} }, { strict: true });
// Error: Property 'address' does not exist at path 'user'

evaluate('usr.name', { user: { name: 'John' } }, { strict: true });
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
  evaluate('missing.path', {}, { strict: true });
} catch (e) {
  console.error(e.message);
  // "Property 'missing' does not exist at path 'root'"
}
```

## TypeScript Support

The library includes TypeScript definitions:

```typescript
import { evaluate, compile, EvaluateOptions } from '@ahsankhanamu/json-transformer';

interface User {
  name: string;
  age: number;
}

const data: { user: User } = {
  user: { name: 'John', age: 30 }
};

const result = evaluate('user.name', data);
// Type: unknown (runtime determined)

const getName = compile<{ user: User }, string>('user.name');
const name = getName(data);
// Type: string
```
