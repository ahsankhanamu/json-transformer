/**
 * MapQL Parser Tests
 */

import { evaluate, validate, toJavaScript } from '../src/index.js';

describe('MapQL Parser', () => {
  const testData = {
    user: {
      firstName: 'John',
      lastName: 'Doe',
      age: 32,
      email: 'john@example.com',
      address: { city: 'New York', country: 'USA' },
    },
    orders: [
      { id: 1, product: 'Widget', price: 25.99, quantity: 2, status: 'shipped' },
      { id: 2, product: 'Gadget', price: 49.99, quantity: 1, status: 'pending' },
      { id: 3, product: 'Gizmo', price: 15.0, quantity: 5, status: 'shipped' },
    ],
    tags: ['electronics', 'sale', 'featured'],
  };

  describe('Property Access', () => {
    test('simple property', () => {
      expect(evaluate('user.firstName', testData)).toBe('John');
    });

    test('nested property', () => {
      expect(evaluate('user.address.city', testData)).toBe('New York');
    });

    test('missing property returns undefined', () => {
      expect(evaluate('user.middleName', testData)).toBeUndefined();
    });

    test('deeply missing property returns undefined', () => {
      expect(evaluate('user.foo.bar.baz', testData)).toBeUndefined();
    });
  });

  describe('Array Access', () => {
    test('index access', () => {
      expect(evaluate('orders[0].product', testData)).toBe('Widget');
    });

    test('last element with negative index', () => {
      expect(evaluate('tags[2]', testData)).toBe('featured');
    });

    test('slice', () => {
      const result = evaluate('orders[0:2]', testData) as any[];
      expect(result).toHaveLength(2);
      expect(result[0].product).toBe('Widget');
    });

    test('spread access maps property', () => {
      expect(evaluate('orders[*].product', testData)).toEqual(['Widget', 'Gadget', 'Gizmo']);
    });

    test('filter', () => {
      const result = evaluate('orders[? status == "shipped"]', testData) as any[];
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });
  });

  describe('Arithmetic', () => {
    test('multiplication', () => {
      expect(evaluate('orders[0].price * orders[0].quantity', testData)).toBeCloseTo(51.98);
    });

    test('operator precedence', () => {
      expect(evaluate('100 + 50 * 2', testData)).toBe(200);
    });

    test('parentheses', () => {
      expect(evaluate('(100 + 50) * 2', testData)).toBe(300);
    });
  });

  describe('String Operations', () => {
    test('concatenation with &', () => {
      expect(evaluate('user.firstName & " " & user.lastName', testData)).toBe('John Doe');
    });

    test('template literal', () => {
      expect(evaluate('`Hello ${user.firstName}!`', testData)).toBe('Hello John!');
    });
  });

  describe('Logical Operations', () => {
    test('comparison', () => {
      expect(evaluate('user.age >= 18', testData)).toBe(true);
    });

    test('and', () => {
      expect(evaluate('user.age > 30 && user.age < 40', testData)).toBe(true);
    });

    test('or', () => {
      expect(evaluate('user.age < 20 || user.age > 30', testData)).toBe(true);
    });
  });

  describe('Null Handling', () => {
    test('null coalescing with existing value', () => {
      expect(evaluate('user.firstName ?? "Anonymous"', testData)).toBe('John');
    });

    test('null coalescing with missing value', () => {
      expect(evaluate('user.nickname ?? "Anonymous"', testData)).toBe('Anonymous');
    });
  });

  describe('Ternary', () => {
    test('true condition', () => {
      expect(evaluate('user.age >= 18 ? "Adult" : "Minor"', testData)).toBe('Adult');
    });

    test('false condition', () => {
      expect(evaluate('user.age >= 50 ? "Senior" : "Not senior"', testData)).toBe('Not senior');
    });
  });

  describe('Pipe Operations', () => {
    test('single pipe', () => {
      expect(evaluate('user.firstName | upper', testData)).toBe('JOHN');
    });

    test('chained pipes', () => {
      expect(evaluate('"  HELLO  " | lower | trim', {})).toBe('hello');
    });
  });

  describe('Pipe Property Access (jq-style)', () => {
    test('.field after pipe', () => {
      const result = evaluate('{ name: "test" } | .name', {});
      expect(result).toBe('test');
    });

    test('.[index] after pipe', () => {
      const result = evaluate('[1, 2, 3] | .[1]', {});
      expect(result).toBe(2);
    });

    test('[index] after pipe (without dot)', () => {
      const result = evaluate('[1, 2, 3] | [1]', {});
      expect(result).toBe(2);
    });

    test('chain pipe property access', () => {
      const result = evaluate('{ items: [{ x: 1 }] } | .items | .[0] | .x', {});
      expect(result).toBe(1);
    });

    test('method call on pipe context', () => {
      const result = evaluate('"hello" | .toUpperCase()', {});
      expect(result).toBe('HELLO');
    });

    test('mix function pipes with property access', () => {
      const result = evaluate('"  hello  " | trim | .toUpperCase()', {});
      expect(result).toBe('HELLO');
    });

    test('access nested property with data', () => {
      const result = evaluate('orders.find(x => x.id === 3) | .status', testData);
      expect(result).toBe('shipped');
    });

    test('access first element then property', () => {
      const result = evaluate('orders | .[0] | .product', testData);
      expect(result).toBe('Widget');
    });

    test('split and access index', () => {
      const result = evaluate('"hello" | .split("") | .[0]', {});
      expect(result).toBe('h');
    });

    test('chain multiple method calls', () => {
      const result = evaluate('"hello world" | .split(" ") | .[0] | .toUpperCase()', {});
      expect(result).toBe('HELLO');
    });

    test('pipe property access followed by function pipe', () => {
      const result = evaluate('user | .firstName | upper', testData);
      expect(result).toBe('JOHN');
    });

    test('nested object access via pipe', () => {
      const result = evaluate('user | .address | .city', testData);
      expect(result).toBe('New York');
    });

    test('function pipe with index access', () => {
      const result = evaluate('"a,b,c" | split(",")[1]', {});
      expect(result).toBe('b');
    });

    test('chained pipe property then function with index', () => {
      const result = evaluate('orders.find(x => x.id === 1) | .status | split(" ")[0]', testData);
      expect(result).toBe('shipped');
    });

    test('function pipe with slice access', () => {
      const result = evaluate('[1,2,3,4,5] | take(4)[1:3]', {});
      expect(result).toEqual([2, 3]);
    });
  });

  describe('Object Construction', () => {
    test('simple object', () => {
      expect(evaluate('{ name: user.firstName, city: user.address.city }', testData)).toEqual({
        name: 'John',
        city: 'New York',
      });
    });

    test('with template literal', () => {
      expect(evaluate('{ fullName: `${user.firstName} ${user.lastName}` }', testData)).toEqual({
        fullName: 'John Doe',
      });
    });
  });

  describe('Function Calls', () => {
    test('upper', () => {
      expect(evaluate('upper(user.firstName)', testData)).toBe('JOHN');
    });

    test('count', () => {
      expect(evaluate('count(orders)', testData)).toBe(3);
    });

    test('sum with spread', () => {
      expect(evaluate('sum(orders[*].price)', testData)).toBeCloseTo(90.98);
    });

    test('round', () => {
      expect(evaluate('round(orders[0].price, 1)', testData)).toBe(26);
    });
  });

  describe('Map Transform', () => {
    test('basic map transform', () => {
      const result = evaluate('orders[*].{ id, total: price * quantity }', testData) as any[];
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 1, total: 51.98 });
    });
  });

  describe('Variable Bindings', () => {
    test('let binding', () => {
      const expr = `
        let total = orders[0].price * orders[0].quantity;
        let tax = total * 0.1;
        { subtotal: total, tax: tax, total: total + tax }
      `;
      const result = evaluate(expr, testData) as any;
      expect(result.subtotal).toBeCloseTo(51.98);
      expect(result.tax).toBeCloseTo(5.198);
      expect(result.total).toBeCloseTo(57.178);
    });
  });

  describe('Validation', () => {
    test('valid expression returns null', () => {
      expect(validate('user.firstName')).toBeNull();
    });

    test('invalid expression returns error', () => {
      const error = validate('user.');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Code Generation', () => {
    test('generates readable JavaScript', () => {
      const code = toJavaScript('user.firstName | upper');
      expect(code).toContain('__helpers.upper');
      expect(code).toContain('input?.user?.firstName');
    });
  });

  describe('Strict Mode - Enhanced Error Messages', () => {
    test('throws descriptive error for missing property', () => {
      expect(() => {
        evaluate('user.missing', testData, { strict: true });
      }).toThrow(/does not exist/);
    });

    test('throws error for null access', () => {
      expect(() => {
        evaluate('user.nickname.length', testData, { strict: true });
      }).toThrow();
    });

    test('suggests similar property names (typo detection)', () => {
      try {
        evaluate('user.adress', testData, { strict: true });
        expect(true).toBe(false); // Should have thrown
      } catch (err: any) {
        expect(err.message).toContain('adress');
        expect(err.suggestions).toContain('address');
      }
    });

    test('throws error for array index out of bounds', () => {
      expect(() => {
        evaluate('orders[999]', testData, { strict: true });
      }).toThrow(/out of bounds/);
    });

    test('throws error when accessing non-array with spread', () => {
      expect(() => {
        evaluate('user[*]', testData, { strict: true });
      }).toThrow(/array/);
    });

    test('includes path in error for nested access', () => {
      try {
        evaluate('user.address.missing', testData, { strict: true });
        expect(true).toBe(false); // Should have thrown
      } catch (err: any) {
        expect(err.path).toContain('address');
      }
    });

    test('forgiving mode still returns undefined', () => {
      // Same expressions should work in forgiving mode
      expect(evaluate('user.missing', testData)).toBeUndefined();
      expect(evaluate('user.nickname.length', testData)).toBeUndefined();
      expect(evaluate('user.adress', testData)).toBeUndefined();
    });
  });
});
