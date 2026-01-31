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

## [Unreleased] - 2026-01-31

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
