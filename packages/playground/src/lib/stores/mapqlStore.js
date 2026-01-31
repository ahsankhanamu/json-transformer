import { writable, derived } from 'svelte/store';

// MapQL module reference
let mapqlModule = null;

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
export const mapqlLoaded = writable(false);

// Initialize MapQL
export async function initMapQL() {
  try {
    mapqlModule = await import('@ahsankhanamu/json-transformer');
    mapqlLoaded.set(true);
    return true;
  } catch (e) {
    console.error('Failed to load MapQL:', e);
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
  [expression, mapqlLoaded],
  ([$expression, $mapqlLoaded]) => {
    if (!$mapqlLoaded || !mapqlModule) {
      return { valid: false, error: 'Loading...' };
    }
    try {
      const error = mapqlModule.validate($expression);
      return error ? { valid: false, error: error.message } : { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
);

export const evaluationResult = derived(
  [expression, parsedInput, validationResult, strictMode, mapqlLoaded],
  ([$expression, $parsedInput, $validationResult, $strictMode, $mapqlLoaded]) => {
    if (!$mapqlLoaded || !mapqlModule) {
      return { success: false, error: 'Loading...' };
    }
    if (!$parsedInput.success) {
      return { success: false, error: 'Invalid JSON input' };
    }
    if (!$validationResult.valid) {
      return { success: false, error: $validationResult.error };
    }

    try {
      const result = mapqlModule.evaluate($expression, $parsedInput.data, { strict: $strictMode });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message, details: e };
    }
  }
);

export const astResult = derived(
  [expression, validationResult, mapqlLoaded],
  ([$expression, $validationResult, $mapqlLoaded]) => {
    if (!$mapqlLoaded || !mapqlModule) return null;
    if (!$validationResult.valid) return null;
    try {
      return mapqlModule.parse($expression);
    } catch {
      return null;
    }
  }
);

export const generatedJs = derived(
  [expression, validationResult, strictMode, mapqlLoaded],
  ([$expression, $validationResult, $strictMode, $mapqlLoaded]) => {
    if (!$mapqlLoaded || !mapqlModule) return '';
    if (!$validationResult.valid) return '';
    try {
      return mapqlModule.toJavaScript($expression, {
        strict: $strictMode,
        pretty: true,
        wrapInFunction: true,
        functionName: 'transform'
      });
    } catch {
      return '';
    }
  }
);

export const nativeJs = derived(
  [expression, validationResult, strictMode, mapqlLoaded],
  ([$expression, $validationResult, $strictMode, $mapqlLoaded]) => {
    if (!$mapqlLoaded || !mapqlModule) return '';
    if (!$validationResult.valid) return '';
    try {
      return mapqlModule.toJavaScript($expression, {
        strict: $strictMode,
        pretty: true,
        wrapInFunction: true,
        functionName: 'transform',
        native: true
      });
    } catch {
      return '';
    }
  }
);
