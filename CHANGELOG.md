# Changelog

## [0.1.0] - 2026-01-31

### Monorepo Restructuring

Restructured project from single package to npm workspaces monorepo.

#### New Structure
```
json-transformer/
├── packages/
│   ├── core/        # @ahsankhanamu/json-transformer - The library
│   ├── playground/  # json-transformer-playground - Interactive web app
│   └── docs/        # json-transformer-docs - Documentation (Starlight)
├── package.json     # Workspace root
└── tsconfig.base.json
```

#### Package Names
- **@ahsankhanamu/json-transformer** - Core library (publishable to npm)
- **json-transformer-playground** - SvelteKit web playground (private)
- **json-transformer-docs** - Astro Starlight documentation site (private)

#### Commands
```bash
npm run build      # Build @ahsankhanamu/json-transformer
npm test           # Run tests
npm run dev        # Start playground on localhost:5173
npm run dev:docs   # Start docs site
npm run clean      # Clean build artifacts
```

---

## [Unreleased] - 2026-02-01

### Arrow Function Implicit Property Access

Added concise syntax for accessing properties inside arrow function bodies using `.property` notation.

#### Syntax

Inside arrow functions, `.property` automatically resolves to `param.property`:

```javascript
// These are equivalent:
orders.filter(x => x.price > 20)
orders.filter(x => .price > 20)     // Implicit: .price → x.price

// Works with all array methods:
orders.map(o => .product)           // → ["Widget", "Gadget", "Gizmo"]
orders.find(o => .status === "shipped")
orders.filter(o => .price > 20).map(o => .product)

// Index access:
arrays.map(a => .[0])               // First element of each sub-array

// Method calls:
tags.map(t => .toUpperCase())       // → ["ELECTRONICS", "SALE", "FEATURED"]

// Nested properties:
items.map(i => .info.name)          // → nested property from each item

// Both sides of comparison:
items.filter(x => .a > .b)          // Compare two properties
```

This provides a concise syntax similar to filter predicates (`[? .price > 20]`) but for native JavaScript array methods like `.map()`, `.filter()`, `.find()`, etc.

#### Implementation

- Added `arrowParamStack` to parser to track current arrow function parameter names
- When parsing `.property` inside arrow body, resolve to `param.property` instead of `input.property`
- Supports nested arrow functions (each level uses its own parameter)

#### Files Changed

| File | Changes |
|------|---------|
| `packages/core/src/parser.ts` | Added `arrowParamStack`, `parseArrowContextAccess()` method |
| `packages/core/test/parser.test.ts` | Added 8 test cases for implicit property access |
| `packages/docs/src/content/docs/reference/expressions.md` | Added documentation |

---

### Automatic Property Projection for Array Operations

Property access after array operations (filter, slice) now automatically maps to extract that property from each element.

```javascript
// Before (explicit spread required):
orders[? status === "shipped"][].product
orders[0:2][].product

// Now (automatic projection):
orders[? status === "shipped"].product     // → ["Widget", "Gizmo"]
orders[0:2].product                        // → ["Widget", "Gadget"]

// Chained property access also works:
items[? active].info.name                  // → nested property from each item
items[0:2].info.name                       // → nested property from each sliced item
```

#### Implementation

- Modified `generateMemberAccess()` in codegen to detect FilterAccess and SliceAccess as object
- Added recursive detection for chained property access after filter/spread/slice
- Added `isArrayProducingMemberAccess()` helper method

---

### Pipe Property Access (jq-style)

Added jq-inspired property access syntax after pipe operator for cleaner data transformations.

#### Syntax

| Syntax | Description | Example |
|--------|-------------|---------|
| `val \| .field` | Access property on pipe value | `user \| .name` → `"John"` |
| `val \| .[0]` | Access index on pipe value | `[1,2,3] \| .[1]` → `2` |
| `val \| .["key"]` | Dynamic key access | `obj \| .[fieldName]` |
| `val \| .method()` | Call method on pipe value | `"hello" \| .toUpperCase()` → `"HELLO"` |
| `val \| .a.b.c` | Chain property access | `user \| .address.city` |

#### Examples

```javascript
// Find and access property
orders.find(x => x.id === 3) | .status      // → "shipped"

// Chain multiple property accesses
{ items: [{ x: 1 }] } | .items | .[0] | .x  // → 1

// Call methods on piped value
"hello" | .split("") | .[0]                 // → "h"
"  hello  " | trim | .toUpperCase()         // → "HELLO"

// Pipe to object construction
user | { name: .firstName, city: .address.city }

// Pipe to array construction
user | [.id, .name, .email]
```

#### Generated Code

Pipe expressions generate clean, readable JavaScript with proper optional chaining:

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
```

#### Files Changed

| File | Changes |
|------|---------|
| `packages/core/src/ast.ts` | Added `PipeContextRef` node type |
| `packages/core/src/parser.ts` | Added `parsePipePropertyAccess()`, `parsePipeContextAccess()`, `parsePipeArrayOrIndex()` methods |
| `packages/core/src/codegen.ts` | Handle `PipeContextRef`, `containsPipeContextRef()`, flattened pipe chain generation |

---

### Theme-Aware Syntax Highlighting

Added full theme support for syntax highlighting in the playground. All code editors now adapt their colors based on the selected theme.

#### Theme Color Schemes

**Dark Theme (One Dark Pro inspired)**
| Element | Color |
|---------|-------|
| Keywords | `#c678dd` (purple) |
| Functions | `#e5c07b` (yellow) |
| Variables | `#e06c75` (coral/salmon) |
| Properties | `#61afef` (blue) |
| Strings | `#98c379` (green) |
| Numbers | `#d19a66` (orange) |
| Operators | `#56b6c2` (cyan) |
| Comments | `#5c6370` (gray italic) |

**Light Theme (GitHub Light / One Light inspired)**
| Element | Color |
|---------|-------|
| Keywords | `#d73a49` (red) |
| Control flow | `#a626a4` (purple) |
| Functions | `#6f42c1` (purple) |
| Variables | `#24292e` (near black) |
| Properties | `#005cc5` (blue) |
| Strings | `#22863a` (green) |
| Numbers | `#005cc5` (blue) |
| Comments | `#6a737d` (gray italic) |

**Midnight Theme**
| Element | Color |
|---------|-------|
| Keywords | `#22d3ee` (cyan) |
| Control flow | `#e879f9` (pink) |
| Functions | `#fcd34d` (yellow) |
| Variables | `#a5f3fc` (light cyan) |
| Strings | `#fda4af` (pink) |
| Numbers | `#86efac` (green) |
| Comments | `#4ade80` (green italic) |

#### Implementation

- CodeMirror `HighlightStyle` now uses CSS classes instead of hardcoded colors
- CSS variables (`--color-syntax-*`) are defined for each theme
- Theme colors applied dynamically via `settingsStore.js` when theme changes
- Fallback values in CSS ensure proper colors before JavaScript loads

#### Files Changed

| File | Changes |
|------|---------|
| `packages/playground/src/app.css` | Added syntax CSS variables for all themes |
| `packages/playground/src/lib/components/CodeEditor.svelte` | Use CSS classes for syntax highlighting |
| `packages/playground/src/lib/components/CodeViewer.svelte` | Use CSS classes for syntax highlighting |
| `packages/playground/src/lib/components/OutputPanel.svelte` | Fixed padding alignment for line numbers |
| `packages/playground/src/lib/stores/settingsStore.js` | Added syntax colors to theme definitions |

---

## [0.1.1] - 2026-01-31

### Session Summary: Array Operations & Expression Improvements

This session focused on making JSON Transformer more intuitive for array operations and fixing several expression evaluation bugs.

---

### Bug Fixes

#### 1. Arrow Function Parameters Not Scoped (`codegen.ts`)
**Problem:** `orders.map(x => x)` returned `[null, null, null]`

**Root Cause:** Arrow function parameters weren't registered as local variables, so `x` in the body was being converted to `input?.x` instead of just `x`.

**Fix:** Register arrow function params as local variables before generating the body, then restore the previous scope.

```typescript
// Before: x => x generated as (x) => input?.x
// After:  x => x generates as (x) => x
```

---

#### 2. Empty Brackets `[]` Not Supported (`parser.ts`)
**Problem:** `orders[]` threw parse error "Expected expression in brackets"

**Root Cause:** Parser required an expression inside brackets.

**Fix:** Handle empty brackets as shorthand for `[*]` (SpreadAccess).

```javascript
// Now equivalent:
orders[]    // SpreadAccess
orders[*]   // SpreadAccess
```

---

#### 3. `[*].method()` Called Wrong Function (`codegen.ts`)
**Problem:** `orders[*].map(x => x.price)` threw "not a function" error

**Root Cause:** SpreadAccess followed by MemberAccess was treating `.map` as property access on each item, not as a method call on the array.

**Fix:** In `generateCallExpression`, detect SpreadAccess + method call pattern and generate proper array method call.

```javascript
// Before: (orders ?? []).map(item => item?.map)(x => x.price)
// After:  (orders ?? []).map(x => x.price)
```

---

#### 4. Pipe Expression Helper Resolution (`codegen.ts`)
**Problem:** `orders | sort("price")` generated `__helpers.input?.sort(...)` instead of `__helpers.sort(...)`

**Root Cause:** When the pipe's right side was a CallExpression, the callee was being processed through `generateExpression` which turned identifiers into property accesses.

**Fix:** Check if callee is an identifier and use its name directly for helper lookup.

---

#### 5. Nested Paths in sort/groupBy/keyBy (`runtime.ts`)
**Problem:** `sort(orders, "meta.priority")` didn't work with nested paths

**Root Cause:** Runtime functions used simple property access `obj[key]` instead of path traversal.

**Fix:** Added `getNestedValue()` helper to support dot-notation paths in `sort`, `groupBy`, and `keyBy`.

---

### New Features

#### 1. Context Variables for Iterations
Added special variables available inside `[*]` and `[?]` iterations:

| Variable | Maps To | Description |
|----------|---------|-------------|
| `$item` | `item` | Current item |
| `$index`, `$i` | `index` | Current index |
| `$array` | `arr` | Array reference |
| `$length` | `arr.length` | Array length |
| `$first` | `(index === 0)` | Is first item |
| `$last` | `(index === arr.length - 1)` | Is last item |

**Examples:**
```javascript
orders[? $index > 0]           // Skip first
orders[? $first || $last]      // First and last only
orders[? $index < $length - 1] // All but last
```

---

#### 2. `$identifier` Syntax Support (`lexer.ts`)
**Change:** `$` can now start identifiers, enabling `$index`, `$item`, etc.

**Implementation:** Modified `isIdentifierStart()` to include `$`, with special handling to preserve `$` and `$$` as standalone tokens when not followed by identifier characters.

---

#### 3. Relaxed Sort/Group Syntax (`codegen.ts`)
Three equivalent syntaxes for property keys in `sort`, `sortDesc`, `groupBy`, `keyBy`:

```javascript
// Dot-prefix (recommended)
orders[].sort(.price)
orders[].sort(.meta.priority)

// Bare identifier
orders[].sort(price)
orders[].sort(meta.priority)

// Quoted string
orders[].sort("price")
orders[].sort("meta.priority")
```

**Implementation:** Added `tryExtractPropertyPath()` to detect identifiers, member chains, and `CurrentAccess` nodes, converting them to string paths.

---

### Playground Fixes

#### 1. Tab Completion in CodeMirror
**Problem:** Tab didn't accept autocomplete suggestions

**Fix:** Added `acceptCompletion` keybinding for Tab key.

---

#### 2. Syntax Highlighting Contrast
**Problem:** Variable `x` in `x => x` was nearly invisible

**Fix:** Added custom syntax highlighting colors with proper contrast for dark themes.

---

#### 3. Sidepanel Layout Resizer
**Problem:** No resizer between Input JSON and Expression in sidepanel layout

**Fix:** Added vertical resizer with drag functionality.

---

### Files Changed

| File | Changes |
|------|---------|
| `src/lexer.ts` | `$identifier` support |
| `src/parser.ts` | `[]` empty brackets as SpreadAccess |
| `src/codegen.ts` | Arrow function scoping, SpreadAccess methods, pipe resolution, relaxed sort syntax |
| `src/runtime.ts` | Nested path support in sort/groupBy/keyBy |
| `playground/src/lib/components/CodeEditor.svelte` | Tab completion, syntax highlighting |
| `playground/src/routes/+page.svelte` | Sidepanel resizer |

---

### Implementation Cost Analysis

| Feature | Lines Changed | Complexity |
|---------|---------------|------------|
| Arrow function scoping | ~15 | Low |
| Empty brackets `[]` | ~5 | Low |
| SpreadAccess methods | ~15 | Medium |
| Context variables | ~25 | Low |
| `$identifier` lexing | ~10 | Low |
| Relaxed sort syntax | ~40 | Medium |
| Nested paths in runtime | ~30 | Low |
| `.price` dot-prefix | ~15 | Low |

**Total:** ~155 lines of meaningful changes across 4 core files.
