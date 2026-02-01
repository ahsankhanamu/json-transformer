---
title: Playground
description: Interactive playground for writing and testing transformer expressions with intelligent autocomplete.
---

The JSON Transformer Playground provides an interactive environment for writing and testing expressions. It features intelligent autocomplete, live preview, and code generation.

## Features

- **Live Preview**: See transformation results as you type
- **Intelligent Autocomplete**: Context-aware suggestions for properties and functions
- **Multiple Output Views**: Preview, AST, Lib JS, and Standalone JS
- **Theme Support**: Light, dark, and midnight themes
- **Flexible Layouts**: Standard, stacked, and side panel layouts

---

## Autocomplete

The expression editor provides intelligent autocomplete that understands your input JSON structure.

### Input Path Completions

As you type, autocomplete suggests properties from your input JSON:

| You Type | Suggestions |
|----------|-------------|
| `u` | `user` |
| `user.` | `firstName`, `lastName`, `age`, `email`, `address` |
| `user.f` | `firstName` |
| `user.address.` | `city`, `country` |

### Pipe Property Access (jq-style)

The playground supports jq-style pipe property access with full autocomplete:

```javascript
// Type "user | ." to see user's properties
user | .firstName           // → "John"

// Chain multiple pipes
user | .address | .city     // → "New York"

// Works with expressions
orders.find(x => x.id === 3) | .status  // → "shipped"
```

| You Type | Suggestions |
|----------|-------------|
| `user \| .` | `firstName`, `lastName`, `age`, `email`, `address` |
| `user \| .f` | `firstName` |
| `user \| .address \| .` | `city`, `country` |

### Leaf Property Methods

When you access a leaf property (string, number, boolean), autocomplete shows JavaScript methods:

```javascript
user.firstName.            // Shows: toUpperCase, toLowerCase, trim, split, ...
user.firstName.toUpperCase()  // → "JOHN"

user.age.                  // Shows: toFixed, toString, ...
user.age.toFixed(2)        // → "32.00"
```

### Transformer Functions

Built-in helper functions are suggested when not in property context:

```javascript
// Type "up" to see "upper" function
orders | map(o => o.product) | upper

// Type "fi" to see "filter", "find", "first"
orders | filter(o => o.price > 20)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Accept completion |
| `Enter` | Accept completion |
| `↑` / `↓` | Navigate completions |
| `Escape` | Close autocomplete |

---

## Preview Evaluation

When navigating autocomplete options with arrow keys, the preview panel shows the value of the highlighted property:

1. Type `user.` - autocomplete opens
2. Press `↓` to highlight `firstName`
3. Preview shows: `"John"`
4. Press `↓` to highlight `lastName`
5. Preview shows: `"Doe"`

This helps you explore your data structure without committing to a selection.

---

## Ghost Text

As you type, ghost text shows what will be inserted if you accept the completion:

```
user.fir|stName     ← ghost text shows "stName" in gray
        ↑ cursor
```

Press `Tab` to accept the full completion.

---

## Tips

1. **Start with the root**: Type the first letter of a top-level property to see suggestions
2. **Use pipes for readability**: `user | .address | .city` is clearer than `user.address.city` for complex expressions
3. **Explore with arrows**: Use arrow keys in autocomplete to preview values before selecting
4. **Check the AST tab**: See how your expression is parsed
5. **Copy Standalone JS**: The generated code can be used directly in your application
