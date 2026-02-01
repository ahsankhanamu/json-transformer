/**
 * Autocomplete completion sources for the transformer expression editor.
 *
 * Uses the transformer's tokenizer for proper expression parsing instead of regex.
 */

/**
 * @typedef {Object} InputPath
 * @property {string} path - The full path (e.g., "user.address.city")
 * @property {string} type - The type ("property", "array", etc.)
 * @property {string} detail - Description (e.g., "string", "array[3]")
 */

/**
 * @typedef {Object} CompletionOption
 * @property {string} label - Display text
 * @property {string} type - Completion type for styling
 * @property {string} [detail] - Additional info
 * @property {string} [apply] - Text to insert (defaults to label)
 * @property {number} [boost] - Priority boost
 * @property {string} [fullPath] - Full path for preview evaluation
 */

// JS methods organized by type
export const STRING_METHODS = [
  { name: 'length', type: 'property', detail: 'number' },
  { name: 'toUpperCase', type: 'method', apply: 'toUpperCase()', detail: 'string' },
  { name: 'toLowerCase', type: 'method', apply: 'toLowerCase()', detail: 'string' },
  { name: 'trim', type: 'method', apply: 'trim()', detail: 'string' },
  { name: 'trimStart', type: 'method', apply: 'trimStart()', detail: 'string' },
  { name: 'trimEnd', type: 'method', apply: 'trimEnd()', detail: 'string' },
  { name: 'split', type: 'method', apply: 'split("")', detail: 'array' },
  { name: 'slice', type: 'method', apply: 'slice(0)', detail: 'string' },
  { name: 'substring', type: 'method', apply: 'substring(0)', detail: 'string' },
  { name: 'substr', type: 'method', apply: 'substr(0)', detail: 'string' },
  { name: 'charAt', type: 'method', apply: 'charAt(0)', detail: 'string' },
  { name: 'charCodeAt', type: 'method', apply: 'charCodeAt(0)', detail: 'number' },
  { name: 'includes', type: 'method', apply: 'includes("")', detail: 'boolean' },
  { name: 'indexOf', type: 'method', apply: 'indexOf("")', detail: 'number' },
  { name: 'lastIndexOf', type: 'method', apply: 'lastIndexOf("")', detail: 'number' },
  { name: 'startsWith', type: 'method', apply: 'startsWith("")', detail: 'boolean' },
  { name: 'endsWith', type: 'method', apply: 'endsWith("")', detail: 'boolean' },
  { name: 'replace', type: 'method', apply: 'replace("", "")', detail: 'string' },
  { name: 'replaceAll', type: 'method', apply: 'replaceAll("", "")', detail: 'string' },
  { name: 'padStart', type: 'method', apply: 'padStart(2, "0")', detail: 'string' },
  { name: 'padEnd', type: 'method', apply: 'padEnd(2, "0")', detail: 'string' },
  { name: 'repeat', type: 'method', apply: 'repeat(2)', detail: 'string' },
  { name: 'match', type: 'method', apply: 'match(/pattern/)', detail: 'array|null' },
  { name: 'search', type: 'method', apply: 'search(/pattern/)', detail: 'number' },
  { name: 'toString', type: 'method', apply: 'toString()', detail: 'string' },
];

export const ARRAY_METHODS = [
  { name: 'length', type: 'property', detail: 'number' },
  { name: 'map', type: 'method', apply: 'map(x => x)', detail: 'array' },
  { name: 'filter', type: 'method', apply: 'filter(x => x)', detail: 'array' },
  { name: 'find', type: 'method', apply: 'find(x => x)', detail: 'value' },
  { name: 'findIndex', type: 'method', apply: 'findIndex(x => x)', detail: 'number' },
  { name: 'findLast', type: 'method', apply: 'findLast(x => x)', detail: 'value' },
  { name: 'findLastIndex', type: 'method', apply: 'findLastIndex(x => x)', detail: 'number' },
  { name: 'some', type: 'method', apply: 'some(x => x)', detail: 'boolean' },
  { name: 'every', type: 'method', apply: 'every(x => x)', detail: 'boolean' },
  { name: 'includes', type: 'method', apply: 'includes(value)', detail: 'boolean' },
  { name: 'indexOf', type: 'method', apply: 'indexOf(value)', detail: 'number' },
  { name: 'lastIndexOf', type: 'method', apply: 'lastIndexOf(value)', detail: 'number' },
  { name: 'reduce', type: 'method', apply: 'reduce((acc, x) => acc, initial)', detail: 'value' },
  {
    name: 'reduceRight',
    type: 'method',
    apply: 'reduceRight((acc, x) => acc, initial)',
    detail: 'value',
  },
  { name: 'forEach', type: 'method', apply: 'forEach(x => {})', detail: 'void' },
  { name: 'join', type: 'method', apply: 'join(", ")', detail: 'string' },
  { name: 'slice', type: 'method', apply: 'slice(0)', detail: 'array' },
  { name: 'concat', type: 'method', apply: 'concat([])', detail: 'array' },
  { name: 'flat', type: 'method', apply: 'flat()', detail: 'array' },
  { name: 'flatMap', type: 'method', apply: 'flatMap(x => x)', detail: 'array' },
  { name: 'reverse', type: 'method', apply: 'reverse()', detail: 'array' },
  { name: 'sort', type: 'method', apply: 'sort((a, b) => a - b)', detail: 'array' },
  { name: 'toSorted', type: 'method', apply: 'toSorted((a, b) => a - b)', detail: 'array' },
  { name: 'toReversed', type: 'method', apply: 'toReversed()', detail: 'array' },
  { name: 'at', type: 'method', apply: 'at(0)', detail: 'value' },
  { name: 'toString', type: 'method', apply: 'toString()', detail: 'string' },
];

export const NUMBER_METHODS = [
  { name: 'toFixed', type: 'method', apply: 'toFixed(2)', detail: 'string' },
  { name: 'toPrecision', type: 'method', apply: 'toPrecision(2)', detail: 'string' },
  { name: 'toExponential', type: 'method', apply: 'toExponential()', detail: 'string' },
  { name: 'toString', type: 'method', apply: 'toString()', detail: 'string' },
];

export const OBJECT_METHODS = [
  { name: 'toString', type: 'method', apply: 'toString()', detail: 'string' },
  { name: 'hasOwnProperty', type: 'method', apply: 'hasOwnProperty("")', detail: 'boolean' },
];

// All methods combined (fallback when type is unknown)
export const JS_METHODS = [
  ...STRING_METHODS.filter(
    (m) => !['length', 'toString', 'includes', 'indexOf', 'lastIndexOf', 'slice'].includes(m.name)
  ),
  ...ARRAY_METHODS.filter((m) => !['toString'].includes(m.name)),
  ...NUMBER_METHODS.filter((m) => !['toString'].includes(m.name)),
  { name: 'length', type: 'property', detail: 'number' },
  { name: 'toString', type: 'method', apply: 'toString()', detail: 'string' },
  { name: 'includes', type: 'method', apply: 'includes(value)', detail: 'boolean' },
  { name: 'indexOf', type: 'method', apply: 'indexOf(value)', detail: 'number' },
  { name: 'slice', type: 'method', apply: 'slice(0)', detail: 'string|array' },
];

/**
 * Get the type of a path from inputPaths
 * @param {InputPath[]} inputPaths
 * @param {string} path
 * @returns {'string' | 'number' | 'array' | 'object' | 'boolean' | 'unknown'}
 */
export function getPathType(inputPaths, path) {
  const pathLower = path.toLowerCase();
  const match = inputPaths.find((p) => p.path.toLowerCase() === pathLower);
  if (!match) return 'unknown';

  const detail = match.detail.toLowerCase();
  if (detail.startsWith('array')) return 'array';
  if (detail === 'string') return 'string';
  if (detail === 'number') return 'number';
  if (detail === 'boolean') return 'boolean';
  if (detail === 'object') return 'object';
  return 'unknown';
}

/**
 * Get methods for a specific type
 * @param {string} valueType - 'string' | 'number' | 'array' | 'object' | 'unknown'
 * @returns {Array}
 */
export function getMethodsForType(valueType) {
  switch (valueType) {
    case 'string':
      return STRING_METHODS;
    case 'array':
      return ARRAY_METHODS;
    case 'number':
      return NUMBER_METHODS;
    case 'object':
      return OBJECT_METHODS;
    default:
      return JS_METHODS;
  }
}

/**
 * Find direct children of a path in inputPaths
 * @param {InputPath[]} inputPaths - All available paths
 * @param {string} parentPath - Parent path to find children for
 * @param {string} [prefix] - Optional prefix filter
 * @returns {CompletionOption[]}
 */
export function findChildProperties(inputPaths, parentPath, prefix = '') {
  const parentPathLower = parentPath.toLowerCase();
  const prefixLower = prefix.toLowerCase();
  const options = [];

  for (const p of inputPaths) {
    const pathLower = p.path.toLowerCase();

    // Must be a direct child of parent
    if (!pathLower.startsWith(parentPathLower + '.')) continue;

    const remainder = p.path.slice(parentPath.length + 1);

    // Only direct children (no nested dots or brackets)
    if (remainder.includes('.') || remainder.includes('[')) continue;

    // Filter by prefix if provided
    if (prefixLower && !remainder.toLowerCase().startsWith(prefixLower)) continue;

    // Check if this path has children
    const hasChildren = inputPaths.some(
      (child) =>
        child.path.toLowerCase().startsWith(p.path.toLowerCase() + '.') ||
        child.path.toLowerCase().startsWith(p.path.toLowerCase() + '[')
    );

    options.push({
      label: remainder,
      type: p.type,
      detail: p.detail,
      fullPath: p.path,
      hasChildren,
    });
  }

  return options;
}

/**
 * Find top-level paths that match a prefix
 * @param {InputPath[]} inputPaths - All available paths
 * @param {string} prefix - Prefix to match
 * @returns {CompletionOption[]}
 */
export function findTopLevelPaths(inputPaths, prefix) {
  const prefixLower = prefix.toLowerCase();
  const options = [];

  for (const p of inputPaths) {
    // Only top-level (no dots or brackets)
    if (p.path.includes('.') || p.path.includes('[')) continue;

    // Must match prefix
    if (!p.path.toLowerCase().startsWith(prefixLower)) continue;

    const hasChildren = inputPaths.some(
      (child) =>
        child.path.toLowerCase().startsWith(p.path.toLowerCase() + '.') ||
        child.path.toLowerCase().startsWith(p.path.toLowerCase() + '[')
    );

    options.push({
      label: p.path,
      type: p.type,
      detail: p.detail,
      fullPath: p.path,
      hasChildren,
    });
  }

  return options;
}

/**
 * Check if a path has children in inputPaths
 * @param {InputPath[]} inputPaths
 * @param {string} path
 * @returns {boolean}
 */
export function hasInputChildren(inputPaths, path) {
  const pathLower = path.toLowerCase();
  return inputPaths.some(
    (p) =>
      p.path.toLowerCase().startsWith(pathLower + '.') ||
      p.path.toLowerCase().startsWith(pathLower + '[')
  );
}

/**
 * Get JS methods filtered by prefix and optionally by value type
 * @param {string} prefix - Filter by method name prefix
 * @param {string} [valueType] - 'string' | 'number' | 'array' | 'object' | 'unknown'
 * @returns {CompletionOption[]}
 */
export function getJSMethods(prefix = '', valueType = 'unknown') {
  const prefixLower = prefix.toLowerCase();
  const methods = getMethodsForType(valueType);
  return methods
    .filter((m) => m.name.toLowerCase().startsWith(prefixLower))
    .map((m) => ({
      label: m.name,
      type: m.type,
      apply: m.apply || m.name,
      detail: m.detail,
    }));
}

/**
 * Extract the source path from tokens before a pipe.
 * Uses the transformer's tokenizer for accurate parsing.
 *
 * @param {Function} tokenize - The tokenize function from json-transformer
 * @param {Object} TokenType - TokenType enum from json-transformer
 * @param {string} text - The text to analyze
 * @param {InputPath[]} inputPaths - Available input paths
 * @returns {string|null} The resolved path or null
 */
export function extractPipeSourceWithTokenizer(tokenize, TokenType, text, inputPaths) {
  try {
    const tokens = tokenize(text);

    // Find the last PIPE token
    let lastPipeIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].type === TokenType.PIPE) {
        lastPipeIndex = i;
        break;
      }
    }

    if (lastPipeIndex === -1) {
      // No pipe found - extract simple path from end
      return extractPathFromTokens(tokens, tokens.length - 1, TokenType);
    }

    // Check if there's a DOT after the PIPE (pipe property access)
    const afterPipe = tokens.slice(lastPipeIndex + 1).filter((t) => t.type !== TokenType.EOF);
    if (afterPipe.length > 0 && afterPipe[0].type === TokenType.DOT) {
      // This is pipe property access: expr | .property
      const tokensBeforePipe = tokens.slice(0, lastPipeIndex);

      // Extract the property path after the dot (e.g., "address" from "| .address")
      const pipeProperty = extractPropertyPath(afterPipe.slice(1), TokenType);

      // Look for chained pipe property: user | .address | .city
      let prevPipeIndex = -1;
      for (let i = tokensBeforePipe.length - 1; i >= 0; i--) {
        if (tokensBeforePipe[i].type === TokenType.PIPE) {
          prevPipeIndex = i;
          break;
        }
      }

      if (prevPipeIndex !== -1) {
        // Chained pipe - recursively resolve the previous pipe
        const textUpToPrevPipe = text.slice(0, tokens[lastPipeIndex].start);
        const basePath = extractPipeSourceWithTokenizer(
          tokenize,
          TokenType,
          textUpToPrevPipe,
          inputPaths
        );
        if (basePath && pipeProperty) {
          return basePath + '.' + pipeProperty;
        }
        return basePath;
      }

      // Simple pipe: expr | .property
      // Extract base path from tokens before the pipe
      const basePath = extractPathFromTokens(
        tokensBeforePipe,
        tokensBeforePipe.length - 1,
        TokenType
      );

      // Combine base with pipe property
      if (basePath && pipeProperty) {
        return basePath + '.' + pipeProperty;
      }
      return basePath;
    }

    return null;
  } catch {
    // Tokenization failed (incomplete expression) - fall back to regex
    return extractPipeSourceFallback(text, inputPaths);
  }
}

/**
 * Extract a path from tokens ending at the given index
 * Handles: identifier, identifier.property, identifier.property.subproperty
 */
function extractPathFromTokens(tokens, endIndex, TokenType) {
  const parts = [];
  let i = endIndex;

  // Skip EOF
  while (i >= 0 && tokens[i].type === TokenType.EOF) {
    i--;
  }

  // Walk backwards collecting identifiers and dots
  while (i >= 0) {
    const token = tokens[i];

    if (token.type === TokenType.IDENTIFIER) {
      parts.unshift(token.value);
      i--;

      // Check for preceding dot
      if (i >= 0 && tokens[i].type === TokenType.DOT) {
        i--;
        continue;
      }
      break;
    } else if (token.type === TokenType.RPAREN) {
      // Skip over function call: find balanced parens
      let parenDepth = 1;
      i--;
      while (i >= 0 && parenDepth > 0) {
        if (tokens[i].type === TokenType.RPAREN) parenDepth++;
        if (tokens[i].type === TokenType.LPAREN) parenDepth--;
        i--;
      }
      // After parens, expect identifier (method name)
      if (i >= 0 && tokens[i].type === TokenType.IDENTIFIER) {
        // This is a method call, include it but don't resolve further
        parts.unshift(tokens[i].value + '()');
        i--;
        if (i >= 0 && tokens[i].type === TokenType.DOT) {
          i--;
          continue;
        }
      }
      break;
    } else {
      break;
    }
  }

  return parts.length > 0 ? parts.join('.') : null;
}

/**
 * Extract property path from tokens (after a dot in pipe context)
 */
function extractPropertyPath(tokens, TokenType) {
  const parts = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === TokenType.IDENTIFIER) {
      parts.push(token.value);
    } else if (token.type === TokenType.DOT && parts.length > 0) {
      // Continue to next identifier
      continue;
    } else if (token.type === TokenType.EOF) {
      break;
    } else {
      break;
    }
  }

  return parts.length > 0 ? parts.join('.') : null;
}

/**
 * Fallback regex-based extraction (for incomplete expressions)
 */
function extractPipeSourceFallback(text, inputPaths) {
  const trimmed = text.trim();

  // Check for chained pipe: ... | .something
  const chainedMatch = trimmed.match(/\|\s*\.([\w.]+)\s*$/);
  if (chainedMatch) {
    const lastProp = chainedMatch[1];
    const matchingPath = inputPaths.find(
      (p) =>
        p.path.toLowerCase() === lastProp.toLowerCase() ||
        p.path.toLowerCase().endsWith('.' + lastProp.toLowerCase())
    );
    return matchingPath?.path || null;
  }

  // Simple case: identifier.path at end
  const sourceMatch = trimmed.match(/([\w$][\w$.]*)\s*$/);
  return sourceMatch?.[1] || null;
}

// Legacy function for tests (uses regex fallback)
export function extractPipeSource(textBeforePipe, inputPaths) {
  return extractPipeSourceFallback(textBeforePipe, inputPaths);
}
