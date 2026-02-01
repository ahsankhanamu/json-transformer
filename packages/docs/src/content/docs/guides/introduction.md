---
title: Introduction to JSON Transformer
description: Learn about JSON Transformer, a lightweight JSON query and transformation language.
sidebar:
  label: Introduction
---

JSON Transformer is a lightweight JSON query and transformation language that compiles to JavaScript. It provides an intuitive syntax for accessing, filtering, and transforming JSON data.

## Why JSON Transformer?

- **Simple syntax** - Familiar dot notation with powerful extensions
- **Compiles to JavaScript** - Maximum performance and portability
- **Forgiving by default** - Optional chaining handles missing paths gracefully
- **Rich functions** - Built-in helpers for common transformations
- **Type safe** - Optional strict mode for catching errors

## Architecture

```
Expression String → [Lexer] → Tokens → [Parser] → AST → [CodeGen] → JavaScript
```

JSON Transformer expressions are compiled to native JavaScript functions that can be cached and reused for optimal performance.

## Supported Features

| Category | Features |
|----------|----------|
| Literals | Numbers, strings, template literals, booleans, null |
| Operators | `+` `-` `*` `/` `%` `&` (concat) |
| Comparison | `==` `!=` `===` `!==` `<` `>` `<=` `>=` |
| Logical | `&&` `\|\|` `!` `and` `or` `not` |
| Access | `.` `?.` `[]` `?[]` `[*]` `[?]` |
| Other | `??` `?:` `=>` `\|` (pipe) `...` (spread) |

## Installation

```bash
npm install @ahsankhanamu/json-transformer
```

## Basic Usage

```javascript
import { evaluate, compile, toJavaScript } from '@ahsankhanamu/json-transformer';

// One-shot evaluation
const result = evaluate('user.name | upper', { user: { name: 'john' } });
// "JOHN"

// Compile for reuse
const fn = compile('price * quantity');
fn({ price: 10, quantity: 5 }); // 50
fn({ price: 20, quantity: 3 }); // 60

// Generate JavaScript source
const code = toJavaScript('a + b', { pretty: true });
// "return (input?.a + input?.b);"
```
