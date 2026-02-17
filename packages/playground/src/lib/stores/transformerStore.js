import { writable, derived } from 'svelte/store';

// JSON Transformer module reference
let transformerModule = null;

/**
 * Extract all property paths from a JSON object for autocomplete
 * @param {any} obj - The object to extract paths from
 * @param {string} prefix - Current path prefix
 * @param {Set} seen - Set of seen objects (for cycle detection)
 * @returns {Array<{path: string, type: string, detail: string}>}
 */
function extractPaths(obj, prefix = '', seen = new WeakSet()) {
  const paths = [];

  if (obj === null || obj === undefined) return paths;
  if (typeof obj !== 'object') return paths;
  if (seen.has(obj)) return paths; // Prevent cycles
  seen.add(obj);

  if (Array.isArray(obj)) {
    // For arrays, add [] accessor and sample first element's paths
    if (obj.length > 0) {
      const sample = obj[0];
      const sampleType = sample === null ? 'null' : typeof sample;

      // Add [0] for index access
      paths.push({
        path: prefix + '[0]',
        type: 'property',
        detail: `${sampleType} (first element)`,
      });

      // Add [] for spread/map access
      paths.push({
        path: prefix + '[]',
        type: 'property',
        detail: `array[${obj.length}]`,
      });

      // Add [*] for spread access
      paths.push({
        path: prefix + '[*]',
        type: 'property',
        detail: `spread array[${obj.length}]`,
      });

      // Extract paths from first element (for object arrays)
      if (typeof sample === 'object' && sample !== null) {
        const childPaths = extractPaths(sample, prefix + '[].', seen);
        paths.push(...childPaths);
      }
    }
  } else {
    // For objects, extract each property
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const fullPath = prefix ? `${prefix}${key}` : key;
      const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

      // Add the property path
      paths.push({
        path: fullPath,
        type: 'property',
        detail: valueType === 'array' ? `array[${value.length}]` : valueType,
      });

      // Recursively extract nested paths
      if (typeof value === 'object' && value !== null) {
        const childPaths = extractPaths(value, fullPath + '.', seen);
        paths.push(...childPaths);
      }
    }
  }

  return paths;
}

// Core stores
export const inputJson = writable(`{
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 32,
    "email": "john@example.com",
    "address": {
      "city": "New York",
      "country": "USA"
    }
  },
  "orders": [
    { "id": 1, "product": "Widget", "price": 25.99, "quantity": 2, "status": "shipped" },
    { "id": 2, "product": "Gadget", "price": 49.99, "quantity": 1, "status": "pending" },
    { "id": 3, "product": "Gizmo", "price": 15.00, "quantity": 5, "status": "shipped" }
  ],
  "tags": ["electronics", "sale", "featured"]
}`);

export const expression = writable(`// Reusable helpers
const TAX_RATE = 0.1;
let lineTotal = (o) => o.price * o.quantity;

// Compute and update
let total = orders | map(o => lineTotal(o)) | sum;
total = total + total * TAX_RATE;

{
  name: user.firstName & " " & user.lastName,
  location: \`\${user.address.city}, \${user.address.country}\`,
  shippedProducts: orders[? status === "shipped"].product,
  orderCount: orders | count,
  allProducts: orders[].product | join(", "),
  orderSummary: orders[*].{ product, total: lineTotal(.) },
  totalWithTax: total
}`);
export const strictMode = writable(false);
// Preview expression shown when navigating autocomplete (null when not previewing)
export const previewExpression = writable(null);
export const activeTab = writable('preview');
export const transformerLoaded = writable(false);

// Debounced expression for evaluation (avoids expensive eval on every keystroke)
// 250ms is optimal: long enough to batch keystrokes, short enough to feel responsive
// Human perception: <100ms instant, 100-300ms acceptable, >300ms noticeable delay
const EVAL_DEBOUNCE_MS = 250;
let evalDebounceTimer = null;
let isFirstExpressionUpdate = true;
const debouncedExpressionStore = writable('');

// Subscribe to expression and debounce updates to debouncedExpression
expression.subscribe(($expr) => {
  // First update is immediate (initial load), subsequent updates are debounced
  if (isFirstExpressionUpdate) {
    isFirstExpressionUpdate = false;
    debouncedExpressionStore.set($expr);
    return;
  }

  if (evalDebounceTimer) clearTimeout(evalDebounceTimer);
  evalDebounceTimer = setTimeout(() => {
    debouncedExpressionStore.set($expr);
  }, EVAL_DEBOUNCE_MS);
});

// Initialize JSON Transformer
export async function initTransformer() {
  try {
    transformerModule = await import('@ahsankhanamu/json-transformer');
    transformerLoaded.set(true);
    return true;
  } catch (e) {
    console.error('Failed to load JSON Transformer:', e);
    return false;
  }
}

// Get tokenizer for autocomplete (uses the loaded module)
export function getTokenizer() {
  if (!transformerModule) return null;
  return {
    tokenize: transformerModule.tokenize,
    TokenType: transformerModule.TokenType,
  };
}

// Derived stores
export const parsedInput = derived(inputJson, ($inputJson) => {
  if (!$inputJson.trim()) return { success: true, data: undefined };
  try {
    return { success: true, data: JSON.parse($inputJson) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Extract input paths for autocomplete (computed once when input changes)
export const inputPaths = derived(parsedInput, ($parsedInput) => {
  if (!$parsedInput.success) return [];
  return extractPaths($parsedInput.data);
});

// Validation uses debounced expression to avoid flashing errors while typing
export const validationResult = derived(
  [debouncedExpressionStore, transformerLoaded],
  ([$debouncedExpression, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) {
      return { valid: false, error: 'Loading...' };
    }
    if (!$debouncedExpression.trim()) return { valid: true };
    try {
      const error = transformerModule.validate($debouncedExpression);
      return error ? { valid: false, error: error.message } : { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
);

export const evaluationResult = derived(
  [debouncedExpressionStore, parsedInput, validationResult, strictMode, transformerLoaded],
  ([$debouncedExpression, $parsedInput, $validationResult, $strictMode, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) {
      return { success: false, error: 'Loading...' };
    }
    if (!$debouncedExpression.trim() || $parsedInput.data === undefined) {
      return { success: true, data: undefined };
    }
    if (!$parsedInput.success) {
      return { success: false, error: 'Invalid JSON input' };
    }
    if (!$validationResult.valid) {
      return { success: false, error: $validationResult.error };
    }

    try {
      const result = transformerModule.evaluate($parsedInput.data, $debouncedExpression, {
        strict: $strictMode,
      });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message, details: e };
    }
  }
);

// Preview evaluation result (when navigating autocomplete)
export const previewEvaluationResult = derived(
  [previewExpression, parsedInput, transformerLoaded],
  ([$previewExpression, $parsedInput, $transformerLoaded]) => {
    if (!$previewExpression || !$transformerLoaded || !transformerModule) {
      return null;
    }
    if (!$parsedInput.success) {
      return null;
    }

    try {
      // Validate first
      const error = transformerModule.validate($previewExpression);
      if (error) return null;

      const result = transformerModule.evaluate($parsedInput.data, $previewExpression, {
        strict: false,
      });
      return { success: true, data: result, expression: $previewExpression };
    } catch {
      return null;
    }
  }
);

export const astResult = derived(
  [debouncedExpressionStore, validationResult, transformerLoaded],
  ([$debouncedExpression, $validationResult, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) return null;
    if (!$validationResult.valid) return null;
    try {
      return transformerModule.parse($debouncedExpression);
    } catch {
      return null;
    }
  }
);

export const generatedJs = derived(
  [debouncedExpressionStore, validationResult, strictMode, transformerLoaded],
  ([$debouncedExpression, $validationResult, $strictMode, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) return '';
    if (!$validationResult.valid) return '';
    try {
      return transformerModule.toJS($debouncedExpression, {
        strict: $strictMode,
        pretty: true,
        wrapInFunction: true,
        functionName: 'transform',
      });
    } catch {
      return '';
    }
  }
);

export const nativeJs = derived(
  [debouncedExpressionStore, validationResult, strictMode, transformerLoaded],
  ([$debouncedExpression, $validationResult, $strictMode, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) return '';
    if (!$validationResult.valid) return '';
    try {
      return transformerModule.toJS($debouncedExpression, {
        strict: $strictMode,
        pretty: true,
        wrapInFunction: true,
        functionName: 'transform',
        native: true,
      });
    } catch {
      return '';
    }
  }
);
