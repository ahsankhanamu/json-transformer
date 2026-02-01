---
title: Built-in Functions
description: Reference for all JSON Transformer built-in functions.
sidebar:
  label: Functions
---

## String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `upper` | Uppercase | `"hello" \| upper` → `"HELLO"` |
| `lower` | Lowercase | `"HELLO" \| lower` → `"hello"` |
| `trim` | Trim whitespace | `"  hi  " \| trim` → `"hi"` |
| `split` | Split by separator | `"a,b,c" \| split(",")` → `["a","b","c"]` |
| `join` | Join array | `["a","b"] \| join("-")` → `"a-b"` |
| `replace` | Replace first | `"hello" \| replace("l", "L")` → `"heLlo"` |
| `replaceAll` | Replace all | `"hello" \| replaceAll("l", "L")` → `"heLLo"` |
| `substring` | Extract substring | `"hello" \| substring(1, 3)` → `"el"` |
| `startsWith` | Check prefix | `"hello" \| startsWith("he")` → `true` |
| `endsWith` | Check suffix | `"hello" \| endsWith("lo")` → `true` |
| `contains` | Check contains | `"hello" \| contains("ell")` → `true` |
| `padStart` | Pad start | `"5" \| padStart(3, "0")` → `"005"` |
| `padEnd` | Pad end | `"5" \| padEnd(3, "0")` → `"500"` |
| `capitalize` | Capitalize first | `"hello" \| capitalize` → `"Hello"` |
| `camelCase` | To camelCase | `"hello_world" \| camelCase` → `"helloWorld"` |
| `snakeCase` | To snake_case | `"helloWorld" \| snakeCase` → `"hello_world"` |
| `kebabCase` | To kebab-case | `"helloWorld" \| kebabCase` → `"hello-world"` |
| `matches` | Regex match | `"hello" \| matches("^h")` → `true` |

## Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `round` | Round number | `round(3.7)` → `4` |
| `floor` | Round down | `floor(3.7)` → `3` |
| `ceil` | Round up | `ceil(3.2)` → `4` |
| `abs` | Absolute value | `abs(-5)` → `5` |
| `min` | Minimum | `min(1, 2, 3)` → `1` |
| `max` | Maximum | `max(1, 2, 3)` → `3` |
| `clamp` | Clamp to range | `clamp(15, 0, 10)` → `10` |
| `random` | Random 0-1 | `random()` → `0.7234...` |
| `randomInt` | Random integer | `randomInt(1, 10)` → `7` |

## Array Functions

| Function | Description | Example |
|----------|-------------|---------|
| `sum` | Sum numbers | `[1,2,3] \| sum` → `6` |
| `avg` | Average | `[1,2,3] \| avg` → `2` |
| `count` | Count items | `[1,2,3] \| count` → `3` |
| `first` | First item | `[1,2,3] \| first` → `1` |
| `last` | Last item | `[1,2,3] \| last` → `3` |
| `unique` | Remove duplicates | `[1,1,2] \| unique` → `[1,2]` |
| `flatten` | Flatten nested | `[[1],[2]] \| flatten` → `[1,2]` |
| `reverse` | Reverse order | `[1,2,3] \| reverse` → `[3,2,1]` |
| `sort` | Sort ascending | `[3,1,2] \| sort` → `[1,2,3]` |
| `sortDesc` | Sort descending | `[1,2,3] \| sortDesc` → `[3,2,1]` |
| `groupBy` | Group by key | `items \| groupBy("category")` |
| `keyBy` | Index by key | `items \| keyBy("id")` |
| `zip` | Zip arrays | `zip([1,2], ["a","b"])` → `[[1,"a"],[2,"b"]]` |
| `compact` | Remove nulls | `[1,null,2] \| compact` → `[1,2]` |
| `take` | Take first n | `[1,2,3] \| take(2)` → `[1,2]` |
| `drop` | Skip first n | `[1,2,3] \| drop(1)` → `[2,3]` |
| `range` | Generate range | `range(1, 5)` → `[1,2,3,4,5]` |

## Object Functions

| Function | Description | Example |
|----------|-------------|---------|
| `keys` | Get keys | `{a:1} \| keys` → `["a"]` |
| `values` | Get values | `{a:1} \| values` → `[1]` |
| `entries` | Get entries | `{a:1} \| entries` → `[["a",1]]` |
| `pick` | Pick keys | `obj \| pick("a", "b")` |
| `omit` | Omit keys | `obj \| omit("password")` |
| `merge` | Merge objects | `merge(obj1, obj2)` |
| `get` | Get by path | `get(obj, "a.b.c")` |
| `set` | Set by path | `set(obj, "a.b", value)` |

## Type Functions

| Function | Description | Example |
|----------|-------------|---------|
| `type` | Get type | `type("hi")` → `"string"` |
| `isString` | Check string | `isString("hi")` → `true` |
| `isNumber` | Check number | `isNumber(42)` → `true` |
| `isBoolean` | Check boolean | `isBoolean(true)` → `true` |
| `isArray` | Check array | `isArray([])` → `true` |
| `isObject` | Check object | `isObject({})` → `true` |
| `isNull` | Check null | `isNull(null)` → `true` |
| `isUndefined` | Check undefined | `isUndefined(x)` |
| `isEmpty` | Check empty | `isEmpty([])` → `true` |

## Conversion Functions

| Function | Description | Example |
|----------|-------------|---------|
| `toString` | To string | `toString(42)` → `"42"` |
| `toNumber` | To number | `toNumber("42")` → `42` |
| `toBoolean` | To boolean | `toBoolean(1)` → `true` |
| `toArray` | To array | `toArray("a")` → `["a"]` |
| `toJSON` | To JSON string | `toJSON({a:1})` → `'{"a":1}'` |
| `fromJSON` | Parse JSON | `fromJSON('{"a":1}')` → `{a:1}` |

## Date Functions

| Function | Description | Example |
|----------|-------------|---------|
| `now` | Current timestamp | `now()` → `1706745600000` |
| `today` | Today's date | `today()` → `"2024-02-01"` |
| `formatDate` | Format date | `formatDate(date, "YYYY-MM-DD")` |
| `parseDate` | Parse date string | `parseDate("2024-02-01")` |

## Utility Functions

| Function | Description | Example |
|----------|-------------|---------|
| `coalesce` | First non-null | `coalesce(null, "default")` → `"default"` |
| `default` | Default value | `default(value, "fallback")` |
| `if` | Conditional | `if(cond, then, else)` |
| `uuid` | Generate UUID | `uuid()` → `"550e8400-..."` |
