# JSON Transformer

A lightweight JSON query and transformation language that compiles to JavaScript.

## Getting Started

```bash
git clone https://github.com/ahsankhanamu/json-transformer
cd json-transformer
npm install
npm test
```

## Supported Tokens

| Category | Tokens |
|----------|--------|
| Literals | Numbers, strings, template literals, booleans, null |
| Operators | `+` `-` `*` `/` `%` `&` (concat) |
| Comparison | `==` `!=` `===` `!==` `<` `>` `<=` `>=` |
| Logical | `&&` `||` `!` `and` `or` `not` |
| Access | `.` `?.` `[]` `?[]` `[*]` `[?]` |
| Other | `??` `?:` `=>` `|` (pipe) `...` (spread) |
