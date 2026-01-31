import { writable, derived } from 'svelte/store';

// JSON Transformer module reference
let transformerModule = null;

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

export const expression = writable('user.firstName & " " & user.lastName');
export const strictMode = writable(false);
export const activeTab = writable('preview');
export const transformerLoaded = writable(false);

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

// Derived stores
export const parsedInput = derived(inputJson, ($inputJson) => {
  try {
    return { success: true, data: JSON.parse($inputJson) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

export const validationResult = derived(
  [expression, transformerLoaded],
  ([$expression, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) {
      return { valid: false, error: 'Loading...' };
    }
    try {
      const error = transformerModule.validate($expression);
      return error ? { valid: false, error: error.message } : { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
);

export const evaluationResult = derived(
  [expression, parsedInput, validationResult, strictMode, transformerLoaded],
  ([$expression, $parsedInput, $validationResult, $strictMode, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) {
      return { success: false, error: 'Loading...' };
    }
    if (!$parsedInput.success) {
      return { success: false, error: 'Invalid JSON input' };
    }
    if (!$validationResult.valid) {
      return { success: false, error: $validationResult.error };
    }

    try {
      const result = transformerModule.evaluate($expression, $parsedInput.data, {
        strict: $strictMode,
      });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message, details: e };
    }
  }
);

export const astResult = derived(
  [expression, validationResult, transformerLoaded],
  ([$expression, $validationResult, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) return null;
    if (!$validationResult.valid) return null;
    try {
      return transformerModule.parse($expression);
    } catch {
      return null;
    }
  }
);

export const generatedJs = derived(
  [expression, validationResult, strictMode, transformerLoaded],
  ([$expression, $validationResult, $strictMode, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) return '';
    if (!$validationResult.valid) return '';
    try {
      return transformerModule.toJavaScript($expression, {
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
  [expression, validationResult, strictMode, transformerLoaded],
  ([$expression, $validationResult, $strictMode, $transformerLoaded]) => {
    if (!$transformerLoaded || !transformerModule) return '';
    if (!$validationResult.valid) return '';
    try {
      return transformerModule.toJavaScript($expression, {
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
