# Language Specification

Single source of truth for how the transformation language is **parsed**, **represented (AST)**, and **code-generated**. Each part of the pipeline is specified here so that:

- **Parsing** produces exactly the AST this spec defines.
- **AST** is the only contract between parser and codegen; no ad-hoc shapes.
- **Codegen** (native and library) implements the same semantics per node type.
- **Optimizations** (pipe flattening, optional chaining, immutability) are defined once and implemented consistently.

Less code, one specification, seamless behavior across the pipeline.

---

## 1. Pipeline Overview

```
Source (string)
    → Lexer (tokens.ts, lexer.ts)     → Tokens
    → Parser (parser.ts)              → AST (ast.ts)
    → Codegen (codegen/base.ts, native.ts, library.ts) → JavaScript (string)
```

- **Lexer**: one-to-one with token types; no semantics beyond token boundaries.
- **Parser**: recursive descent; precedence and grammar below.
- **AST**: every node type is in `ast.ts`; parser and codegen both use only these types.
- **Codegen**: one dispatcher (`generateExpression` switch); each branch handles one AST node kind. Native and library extend the same base and share literal/binary/ternary/pipe/arrow/if generation.

---

## 2. Tokens (Lexer Output)

Token types are defined in `tokens.ts`. The lexer must produce only these types and no extra ad-hoc tokens.

| Category   | Tokens |
|-----------|--------|
| Literals  | `NUMBER`, `STRING`, `TEMPLATE_*`, `TRUE`, `FALSE`, `NULL`, `UNDEFINED` |
| Keywords  | `LET`, `CONST`, `IF`, `ELSE`, `AS`, `IN`, `AND`, `OR`, `NOT` |
| Operators | `PLUS`, `MINUS`, `STAR`, `SLASH`, `PERCENT`, `AMPERSAND`, `ASSIGN`, `EQ`, `NEQ`, `STRICT_EQ`, `STRICT_NEQ`, `LT`, `GT`, `LTE`, `GTE`, `AND_AND`, `OR_OR`, `BANG`, `QUESTION`, `COLON`, `QUESTION_QUESTION`, `QUESTION_DOT`, `QUESTION_BRACKET`, `PIPE`, `ARROW`, `SPREAD` |
| Punctuation | `DOT`, `COMMA`, `SEMICOLON`, `LPAREN`, `RPAREN`, `LBRACKET`, `RBRACKET`, `LBRACE`, `RBRACE` |
| Context   | `DOLLAR`, `CARET`, `DOLLAR_DOLLAR` |
| Other     | `IDENTIFIER`, `EOF`, `NEWLINE` |

Rule: any new construct in the language must first get a token type (if needed) in `tokens.ts`, then be consumed by the parser. No lexer behavior that implies semantics beyond “this span is this token type.”

---

## 3. Grammar and Precedence (Parser Input)

Expression precedence (lowest to highest). Parser methods should align with this order so parsing is predictable and single-pass.

| Precedence | Name           | Syntax / Notes |
|------------|----------------|----------------|
| 1          | Pipe           | `expr \| expr` (also `\| .prop`, `\| [i]`, `\| [*]`, `\| { }`) |
| 2          | Ternary        | `expr ? expr : expr` |
| 3          | Null coalesce  | `expr ?? expr` |
| 4          | Logical OR     | `expr \|\| expr` |
| 5          | Logical AND    | `expr && expr` |
| 6          | Equality       | `==`, `!=`, `===`, `!==` |
| 7          | Comparison     | `<`, `>`, `<=`, `>=`, `in` |
| 8          | Concatenation  | `expr & expr` (string concat) |
| 9          | Additive       | `+`, `-` |
| 10         | Multiplicative | `*`, `/`, `%` |
| 11         | Unary          | `!`, `not`, `-`, `+` |
| 12         | Postfix        | `?.[`, `?.` (optional chain) |
| 13         | Call / primary | `expr(…)`, `expr.id`, `expr[expr]`, `expr[*]`, `expr[? expr]`, literals, `$`, `^`, `.`, `$$.name` |

Statements:

- Program = optional sequence of statements (`let`/`const` bindings and reassignments), then optional single expression.
- Let binding = `let`|`const` id `=` expression `;`.
- Assignment = id `=` expression `;` (only valid for `let` bindings; `const` reassignment is a parse error).

Rule: new syntax must be assigned a precedence level and implemented in the corresponding parser method; no duplicate or conflicting precedence logic elsewhere.

---

## 4. AST (Contract Between Parser and Codegen)

All node types live in `ast.ts`. Parser must only produce these types; codegen must handle every expression type in the `Expression` union.

### 4.1 Node Types (Summary)

- **Literals**: `NumberLiteral`, `StringLiteral`, `BooleanLiteral`, `NullLiteral`, `UndefinedLiteral`, `TemplateLiteral`
- **Structures**: `ObjectLiteral` (with `StandardProperty`, `ShorthandProperty`, `ComputedProperty`, `SpreadProperty`, `InlineLetProperty`), `ArrayLiteral`, `SpreadElement`
- **Access**: `Identifier`, `MemberAccess`, `IndexAccess`, `SliceAccess`, `SpreadAccess`, `FilterAccess`, `MapTransform`
- **Context**: `RootAccess`, `ParentAccess`, `CurrentAccess`, `BindingAccess`
- **Operators**: `BinaryExpression`, `UnaryExpression`, `TernaryExpression`, `PipeExpression`, `PipeContextRef`, `NullCoalesce`
- **Functions**: `CallExpression`, `ArrowFunction`, `Parameter`
- **Control**: `IfExpression`, `ConditionalBranch`
- **Statements**: `LetBinding`, `Assignment`, `Program`
- **Types (strict)**: `TypeAssertion`, `NonNullAssertion`, plus type annotation nodes

Rule: adding a new language feature means (1) add or reuse an AST node type in `ast.ts`, (2) parser produces it, (3) base codegen’s `generateExpression` gets a case, (4) base/native/library implement any abstract method if needed. No “hidden” node shapes.

### 4.2 Visitor

`ast.ts` defines a `Visitor<T>` and `visit(node, visitor)`. All passes (codegen, analysis, optimizations) should use this so that “how we walk the tree” is uniform and adding a node type forces implementing the visitor method.

---

## 5. Code Generation Semantics

Codegen is specified **per AST node type**. Base generator (`base.ts`) holds the single `generateExpression` dispatcher and shared logic (literals, binary, unary, ternary, null coalesce, arrow, if, pipe flattening). Native and library override only where behavior differs (e.g. safe access, helpers).

### 5.1 Shared Rules (Base)

- **Immutability**: array operations that mutate (e.g. sort) use non-mutating forms (e.g. `toSorted`) or copy-then-mutate (e.g. `[...arr].sort`) so input is never modified.
- **Pipe**: pipe chains are flattened to a single `_pipe` variable and step-by-step assignment; object/array construction and pipe-context refs (`.`) are resolved with `pipeContextVar` set.
- **Optional chaining**: member/index access use `?.` / `?.[]` when the node or grammar marks optional.
- **Null coalescing**: `?? []` for array-producing expressions so methods never run on null/undefined.

### 5.2 Per-Node Behavior (Spec)

| Node type          | Semantics (what generated code must do) |
|--------------------|----------------------------------------|
| Identifier         | Local/binding → as-is; otherwise `inputVar?.name` (or strict access in library). |
| MemberAccess       | Optional chain on object; if “array-producing” and not method chain → auto-project with `.map`. |
| IndexAccess        | Optional index access; `object?.[index]`. |
| SliceAccess        | Slice with start/end; nulls mean default (0 or length). |
| SpreadAccess       | `object ?? []`; used for `[*]` and array-producing context. |
| FilterAccess       | Filter array by predicate; non-mutating. |
| MapTransform       | Map array to object shape (template); each element becomes one object. |
| RootAccess         | `inputVar` (or path from root). |
| ParentAccess       | `parentVar` (or path in parent). |
| CurrentAccess      | Current pipe context or `inputVar` (path may be present). |
| BindingAccess      | `bindingsVar.name`. |
| PipeContextRef     | Value of current pipe step (e.g. `_pipe`). |
| CallExpression     | Local functions resolve as-is (shadowing built-ins); otherwise library uses `__helpers.`, native inlines or warns. |
| Assignment         | `name = expr;` — only valid for `let` bindings. |

Native vs library differences (e.g. strict mode, helper resolution) are options on the generator; the **semantics** of each node type above stay the same.

### 5.3 Optimization Points (Single Place)

- **Pipe flattening**: one `_pipe` variable, linear steps; no nested pipe temporaries.
- **Array-producing + property**: auto-project with `.map` when appropriate; skip when property is an array method (method chaining).
- **Concatenation**: `&` chains flattened and emitted as one template literal.
- **Inline lets in objects**: hoisted as flat statements at program/pipe level; IIFE only inside map callbacks where statement context is unavailable.
- **User-defined functions**: `localVariables` propagated to child generators so let-bound functions resolve correctly inside map transforms, filter predicates, and piped maps.

These are the only optimization patterns; they live in base (and shared helpers) so native and library stay in sync.

---

## 6. How This Reduces Duplication and Keeps Things Optimized

| Concern           | Where it’s specified / implemented |
|-------------------|-------------------------------------|
| What is a token   | `tokens.ts` only; lexer only produces these. |
| Precedence/grammar| This doc (§3); parser follows it in one place. |
| Node shapes       | `ast.ts` only; parser and codegen both use these types. |
| Per-node codegen  | Base `generateExpression` switch + abstract methods; one place per node. |
| Shared codegen    | Base class (literals, binary, ternary, pipe, arrow, if); no copy-paste in native/library. |
| Optimizations     | Base (pipe flattening, auto-project, concat flatten, inline lets); no scattered logic. |

Adding a feature:

1. If new token: add to `tokens.ts`, then lexer.
2. Grammar: add to §3 and corresponding parser method.
3. AST: add or reuse type in `ast.ts`, extend `Expression` and visitor.
4. Codegen: add case in `generateExpression` and implement any new abstract method in base/native/library.

Parsing, AST, and codegen stay aligned because the **language specification** (this document plus `ast.ts` and `tokens.ts`) defines how each part works and how they connect—with less code and a single place to optimize.
