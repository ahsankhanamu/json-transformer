# Autocomplete Specification

## Overview

The expression editor provides intelligent autocomplete for:
1. **Input path properties** - Navigate the input JSON structure
2. **Pipe property access** - jq-style `user | .firstName` syntax
3. **Transformer functions** - Built-in helper functions
4. **JS methods** - Native JavaScript methods for leaf properties

## Completion Priority

Completions are checked in order (first match wins):
1. `pipePropertyCompletions` - After `| .`
2. `inputPathCompletions` - After `.` or for identifiers
3. `transformerCompletions` - Functions and keywords
4. `dotCompletions` - JS methods for leaf properties

---

## Test Cases by Scenario

### 1. Top-Level Input Paths

| Input | Expected Completions |
|-------|---------------------|
| `u` | `user` |
| `us` | `user` |
| `user` | `user` |
| `o` | `orders` |
| `t` | `tags` |
| `xyz` | (none) |

### 2. Property Access (Dot Notation)

| Input | Expected Completions |
|-------|---------------------|
| `user.` | `firstName`, `lastName`, `age`, `email`, `address` |
| `user.f` | `firstName` |
| `user.a` | `age`, `address` |
| `user.address.` | `city`, `country` |
| `user.address.c` | `city`, `country` |

### 3. Leaf Properties (JS Methods)

When a property has no children (leaf node), show JS methods:

| Input | Expected Completions |
|-------|---------------------|
| `user.address.city.` | `toUpperCase`, `toLowerCase`, `trim`, `length`, ... |
| `user.address.city.to` | `toUpperCase`, `toLowerCase`, `toString` |
| `user.firstName.` | `toUpperCase`, `toLowerCase`, `split`, ... |

### 4. Pipe Property Access (jq-style)

| Input | Expected Completions |
|-------|---------------------|
| `user \| .` | `firstName`, `lastName`, `age`, `email`, `address` |
| `user \| .f` | `firstName` |
| `user \| .fir` | `firstName` |
| `user \| .address \| .` | `city`, `country` |
| `user \| .address \| .c` | `city`, `country` |

### 5. Transformer Functions

Functions are shown when not in property access context:

| Input | Expected Completions |
|-------|---------------------|
| `up` | `upper` (function) |
| `fi` | `filter`, `find`, `first` (functions) |
| `user.` + `f` | `firstName` (NOT functions - property context) |

---

## Implementation Details

### Files

- `completions.js` - Pure functions for completion logic (testable)
- `completions.test.js` - Test suite (33 tests)
- `CodeEditor.svelte` - CodeMirror integration

### Key Functions

```javascript
// Find children of a path
findChildProperties(inputPaths, 'user', 'f') // → [{label: 'firstName', ...}]

// Find top-level paths
findTopLevelPaths(inputPaths, 'u') // → [{label: 'user', ...}]

// Check if path has children
hasInputChildren(inputPaths, 'user') // → true
hasInputChildren(inputPaths, 'user.firstName') // → false

// Get JS methods
getJSMethods('to') // → [toUpperCase, toLowerCase, toString, toFixed]

// Extract pipe source
extractPipeSource('user | .address', inputPaths) // → 'user.address'
```

---

## Running Tests

```bash
cd packages/playground
node src/lib/autocomplete/completions.test.js
```

Expected output: `Passed: 33, Failed: 0`

---

## Tokenizer-Based Parsing

The autocomplete now uses the transformer's tokenizer for accurate expression parsing:

```javascript
import { extractPipeSourceWithTokenizer } from './completions.js';
import { tokenize, TokenType } from '@ahsankhanamu/json-transformer';

// Complex expressions work correctly
extractPipeSourceWithTokenizer(tokenize, TokenType, 'orders.find(x => x.id === 1)', inputPaths);
// → "orders.find()" (extracts path including method call)

// Chained pipes resolve properly
extractPipeSourceWithTokenizer(tokenize, TokenType, 'user | .address', inputPaths);
// → "user.address"
```

**Benefits over regex:**
- Handles parentheses, brackets, and complex expressions
- Properly parses chained pipes: `user | .address | .city`
- Falls back to regex for incomplete/invalid expressions

## Known Limitations

1. **Array element properties**: `orders[].product` paths are in inputPaths but autocomplete for `orders[0].` doesn't resolve element properties.

2. **No type inference**: We don't know if a value is string/number/array, so all JS methods are shown for leaf nodes.
