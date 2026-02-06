/**
 * Extensibility Tests
 *
 * Tests for the 3-tier extensibility system:
 * 1. Global registry (registerFunction, registerLibrary)
 * 2. Configured instance (createTransformer)
 * 3. Per-evaluation (evaluate options.helpers)
 *
 * Priority: per-evaluation > instance > global > built-in
 */

import {
  evaluate,
  compile,
  toJS,
  registerFunction,
  unregisterFunction,
  registerLibrary,
  unregisterLibrary,
  getCustomHelpers,
  getLibraries,
  clearRegistry,
  hasCustomHelper,
  hasLibrary,
  createTransformer,
  clearCache,
  getLibrary,
} from '../src/index.js';

// Clear registry before each test
beforeEach(() => {
  clearRegistry();
  clearCache();
});

afterEach(() => {
  clearRegistry();
  clearCache();
});

describe('Global Registry', () => {
  describe('registerFunction', () => {
    it('should register a simple helper function', () => {
      registerFunction('double', (x: number) => x * 2);
      expect(hasCustomHelper('double')).toBe(true);
      const result = evaluate({ value: 5 }, 'value | double');
      expect(result).toBe(10);
    });

    it('should register a helper with multiple arguments', () => {
      registerFunction('add', (a: number, b: number) => a + b);
      const result = evaluate({}, 'add(3, 4)');
      expect(result).toBe(7);
    });

    it('should allow piped calls with additional arguments', () => {
      registerFunction('multiply', (x: number, factor: number) => x * factor);
      const result = evaluate({ value: 5 }, 'value | multiply(3)');
      expect(result).toBe(15);
    });

    it('should throw error for invalid function name', () => {
      expect(() => registerFunction('', () => {})).toThrow('non-empty string');
      expect(() => registerFunction('123invalid', () => {})).toThrow('valid identifier');
      expect(() => registerFunction('has-dash', () => {})).toThrow('valid identifier');
    });

    it('should throw error when not a function', () => {
      expect(() => registerFunction('notFunc', 'string' as any)).toThrow('Expected a function');
    });

    it('should override built-in helpers', () => {
      // Built-in upper converts to uppercase
      expect(evaluate({ s: 'hello' }, 's | upper')).toBe('HELLO');

      // Override with custom implementation
      registerFunction('upper', (s: string) => `CUSTOM: ${s}`);
      // Clear cache so new helper is picked up
      clearCache();
      const result = evaluate({ s: 'hello' }, 's | upper');
      expect(result).toBe('CUSTOM: hello');
    });
  });

  describe('unregisterFunction', () => {
    it('should remove a registered function', () => {
      registerFunction('triple', (x: number) => x * 3);
      expect(hasCustomHelper('triple')).toBe(true);

      const removed = unregisterFunction('triple');
      expect(removed).toBe(true);
      expect(hasCustomHelper('triple')).toBe(false);
    });

    it('should return false for non-existent function', () => {
      const removed = unregisterFunction('nonExistent');
      expect(removed).toBe(false);
    });
  });

  describe('registerLibrary', () => {
    it('should register a library with methods', () => {
      const myLib = {
        double: (x: number) => x * 2,
        triple: (x: number) => x * 3,
      };
      registerLibrary('myLib', myLib);
      expect(hasLibrary('myLib')).toBe(true);
    });

    it('should store library and make it accessible via getLibrary', () => {
      registerLibrary('math', {
        square: (x: number) => x * x,
        cube: (x: number) => x * x * x,
      });

      const lib = getLibrary('math');
      expect(lib).toBeDefined();
      expect((lib as any).square(4)).toBe(16);
      expect((lib as any).cube(3)).toBe(27);
    });

    it('should include libraries in getLibraries', () => {
      registerLibrary('utils', {
        greet: (name: string) => `Hello, ${name}!`,
      });

      const libs = getLibraries();
      expect(libs).toHaveProperty('utils');
      expect((libs.utils as any).greet('World')).toBe('Hello, World!');
    });

    it('should throw error for invalid namespace', () => {
      expect(() => registerLibrary('', {})).toThrow('non-empty string');
      expect(() => registerLibrary('has-dash', {})).toThrow('valid identifier');
    });

    it('should throw error when not an object', () => {
      expect(() => registerLibrary('notObj', 'string' as any)).toThrow('Expected an object');
      expect(() => registerLibrary('notObj', null as any)).toThrow('Expected an object');
    });
  });

  describe('unregisterLibrary', () => {
    it('should remove a registered library', () => {
      registerLibrary('tempLib', { fn: () => 1 });
      expect(hasLibrary('tempLib')).toBe(true);

      const removed = unregisterLibrary('tempLib');
      expect(removed).toBe(true);
      expect(hasLibrary('tempLib')).toBe(false);
    });
  });

  describe('getCustomHelpers / getLibraries', () => {
    it('should return all registered helpers', () => {
      registerFunction('fn1', () => 1);
      registerFunction('fn2', () => 2);

      const helpers = getCustomHelpers();
      expect(helpers).toHaveProperty('fn1');
      expect(helpers).toHaveProperty('fn2');
    });

    it('should return all registered libraries', () => {
      registerLibrary('lib1', { a: 1 });
      registerLibrary('lib2', { b: 2 });

      const libs = getLibraries();
      expect(libs).toHaveProperty('lib1');
      expect(libs).toHaveProperty('lib2');
    });
  });

  describe('clearRegistry', () => {
    it('should clear all helpers and libraries', () => {
      registerFunction('fn1', () => 1);
      registerLibrary('lib1', { a: 1 });

      clearRegistry();

      expect(hasCustomHelper('fn1')).toBe(false);
      expect(hasLibrary('lib1')).toBe(false);
    });
  });
});

describe('Configured Transformer (createTransformer)', () => {
  it('should create transformer with instance helpers', () => {
    const transformer = createTransformer({
      helpers: {
        quadruple: (x: number) => x * 4,
      },
    });

    const result = transformer.evaluate({ value: 5 }, 'value | quadruple');
    expect(result).toBe(20);
  });

  it('should create transformer with instance libraries accessible via getHelpers', () => {
    const transformer = createTransformer({
      libraries: {
        str: {
          reverse: (s: string) => s.split('').reverse().join(''),
        },
      },
    });

    const helpers = transformer.getHelpers();
    expect(helpers).toHaveProperty('str');
    expect((helpers.str as any).reverse('hello')).toBe('olleh');
  });

  it('should have separate cache from global', () => {
    const transformer = createTransformer({
      helpers: { double: (x: number) => x * 2 },
    });

    // Global function should not affect transformer
    registerFunction('double', (x: number) => x * 100);

    // Transformer uses instance helper (priority)
    expect(transformer.evaluate({ v: 5 }, 'v | double')).toBe(10);

    // Global evaluate uses global registry
    clearCache(); // Clear global cache to pick up new helper
    expect(evaluate({ v: 5 }, 'v | double')).toBe(500);
  });

  it('should support compile method', () => {
    const transformer = createTransformer({
      helpers: { increment: (x: number) => x + 1 },
    });

    const fn = transformer.compile('value | increment');
    expect(fn({ value: 10 })).toBe(11);
    expect(fn({ value: 20 })).toBe(21);
  });

  it('should support toJS method', () => {
    const transformer = createTransformer();
    const code = transformer.toJS('value | upper');
    expect(code).toContain('__helpers.upper');
  });

  it('should support default strict mode', () => {
    const strictTransformer = createTransformer({ strict: true });

    expect(() => {
      strictTransformer.evaluate(null, 'name');
    }).toThrow();
  });

  it('should allow clearCache', () => {
    const transformer = createTransformer({
      helpers: { test: () => 'cached' },
    });

    transformer.compile('value | test');
    transformer.clearCache();
    // Should not throw
  });

  it('should allow getHelpers to inspect merged helpers', () => {
    const transformer = createTransformer({
      helpers: { custom: () => 'custom' },
    });

    const helpers = transformer.getHelpers();
    expect(helpers).toHaveProperty('custom');
    expect(helpers).toHaveProperty('upper'); // built-in
  });
});

describe('Per-Evaluation Helpers', () => {
  it('should allow helpers in evaluate options', () => {
    const result = evaluate({ value: 5 }, 'value | triple', {
      helpers: { triple: (x: number) => x * 3 },
    });
    expect(result).toBe(15);
  });

  it('should override global helpers', () => {
    registerFunction('transform', (x: number) => x + 100);

    // Per-evaluation helper has priority
    const result = evaluate({ value: 5 }, 'value | transform', {
      helpers: { transform: (x: number) => x * 10 },
    });
    expect(result).toBe(50);
  });

  it('should override instance helpers', () => {
    const transformer = createTransformer({
      helpers: { modify: (x: number) => x + 1000 },
    });

    // Per-evaluation helper has priority
    const result = transformer.evaluate({ value: 5 }, 'value | modify', {
      helpers: { modify: (x: number) => x - 1 },
    });
    expect(result).toBe(4);
  });

  it('should allow helpers with arguments', () => {
    const result = evaluate({ value: 10 }, 'value | power(2)', {
      helpers: { power: (base: number, exp: number) => Math.pow(base, exp) },
    });
    expect(result).toBe(100);
  });

  it('should not affect cached functions', () => {
    // First call without helpers
    const result1 = evaluate({ v: 5 }, 'v | upper');
    expect(result1).toBe('5'); // upper on number converts to string

    // Second call with per-eval helper - should use fresh function
    const result2 = evaluate({ v: 5 }, 'v | upper', { helpers: { upper: (x: number) => x * 2 } });
    expect(result2).toBe(10);

    // Third call without helpers should use cached (original behavior)
    const result3 = evaluate({ v: 5 }, 'v | upper');
    expect(result3).toBe('5');
  });
});

describe('Priority Resolution', () => {
  it('should follow priority: per-eval > instance > global > built-in', () => {
    // Built-in: upper converts to uppercase
    expect(evaluate({ s: 'test' }, 's | upper')).toBe('TEST');

    // Global: override built-in
    registerFunction('upper', () => 'GLOBAL');
    clearCache();
    expect(evaluate({ s: 'test' }, 's | upper')).toBe('GLOBAL');

    // Instance: override global
    const transformer = createTransformer({
      helpers: { upper: () => 'INSTANCE' },
    });
    expect(transformer.evaluate({ s: 'test' }, 's | upper')).toBe('INSTANCE');

    // Per-eval: override instance
    const result = transformer.evaluate({ s: 'test' }, 's | upper', {
      helpers: { upper: () => 'PER_EVAL' },
    });
    expect(result).toBe('PER_EVAL');
  });

  it('should allow accessing lower-priority helpers when not overridden', () => {
    registerFunction('globalOnly', () => 'from global');

    const transformer = createTransformer({
      helpers: { instanceOnly: () => 'from instance' },
    });

    // Should access global helper from transformer
    expect(transformer.evaluate({}, 'globalOnly()')).toBe('from global');

    // Should access instance helper
    expect(transformer.evaluate({}, 'instanceOnly()')).toBe('from instance');

    // Should access built-in from transformer
    expect(transformer.evaluate({ s: 'hello' }, 's | upper')).toBe('HELLO');
  });
});

describe('Library Access', () => {
  it('should make libraries available via helpers object', () => {
    registerLibrary('myMath', {
      square: (x: number) => x * x,
    });

    // Libraries are accessed at runtime via the merged helpers object
    // Custom functions can call library methods
    registerFunction('squareValue', (x: number) => {
      const libs = getLibraries();
      return (libs.myMath as any).square(x);
    });

    const result = evaluate({ value: 5 }, 'value | squareValue');
    expect(result).toBe(25);
  });

  it('should make instance libraries available via getHelpers', () => {
    const transformer = createTransformer({
      libraries: {
        utils: {
          double: (x: number) => x * 2,
        },
      },
    });

    const helpers = transformer.getHelpers();
    expect(helpers).toHaveProperty('utils');
    expect((helpers.utils as any).double(5)).toBe(10);
  });
});

describe('Backward Compatibility', () => {
  it('should work with existing compile/evaluate without helpers', () => {
    const fn = compile('user.name | upper');
    expect(fn({ user: { name: 'john' } })).toBe('JOHN');

    const result = evaluate({ price: 10, qty: 2 }, 'price * qty');
    expect(result).toBe(20);
  });

  it('should work with existing built-in helpers', () => {
    expect(evaluate({ arr: [3, 1, 2] }, 'arr | sort')).toEqual([1, 2, 3]);
    expect(evaluate({ s: '  hello  ' }, 's | trim')).toBe('hello');
    expect(evaluate({ n: 3.7 }, 'n | round')).toBe(4);
  });

  it('should work with bindings', () => {
    const result = evaluate({ value: 10 }, 'value * $$.multiplier', {
      bindings: { multiplier: 5 },
    });
    expect(result).toBe(50);
  });

  it('should work with strict mode', () => {
    expect(() => {
      evaluate(null, 'name', { strict: true });
    }).toThrow();
  });
});

describe('Edge Cases', () => {
  it('should handle helper that returns undefined', () => {
    registerFunction('returnUndefined', () => undefined);
    const result = evaluate({}, 'returnUndefined()');
    expect(result).toBeUndefined();
  });

  it('should handle helper that returns null', () => {
    registerFunction('returnNull', () => null);
    const result = evaluate({}, 'returnNull()');
    expect(result).toBeNull();
  });

  it('should handle helper that throws', () => {
    registerFunction('throws', () => {
      throw new Error('Helper error');
    });
    expect(() => evaluate({}, 'throws()')).toThrow('Helper error');
  });

  it('should handle helper with no arguments', () => {
    registerFunction('getTimestamp', () => 12345);
    const result = evaluate({}, 'getTimestamp()');
    expect(result).toBe(12345);
  });

  it('should store library methods that can be accessed directly', () => {
    registerLibrary('errorLib', {
      fail: () => {
        throw new Error('Library method error');
      },
    });
    const lib = getLibrary('errorLib');
    expect(() => (lib as any).fail()).toThrow('Library method error');
  });

  it('should handle chaining custom helpers', () => {
    registerFunction('double', (x: number) => x * 2);
    registerFunction('increment', (x: number) => x + 1);

    const result = evaluate({ value: 5 }, 'value | double | increment | double');
    expect(result).toBe(22); // ((5 * 2) + 1) * 2
  });
});

describe('toJS Code Generation', () => {
  it('should generate __helpers calls for custom helpers', () => {
    const code = toJS('value | myCustomHelper');
    expect(code).toContain('__helpers.myCustomHelper');
  });

  it('should generate __helpers calls for helper with args', () => {
    const code = toJS('value | multiply(3)');
    expect(code).toContain('__helpers.multiply');
  });
});
