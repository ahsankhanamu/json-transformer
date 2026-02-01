/**
 * Parser Tests
 */

import { evaluate, validate, toJS } from '../src/index.js';

describe('Parser', () => {
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
      expect(evaluate(testData, 'user.firstName')).toBe('John');
    });

    test('nested property', () => {
      expect(evaluate(testData, 'user.address.city')).toBe('New York');
    });

    test('missing property returns undefined', () => {
      expect(evaluate(testData, 'user.middleName')).toBeUndefined();
    });

    test('deeply missing property returns undefined', () => {
      expect(evaluate(testData, 'user.foo.bar.baz')).toBeUndefined();
    });
  });

  describe('Array Access', () => {
    test('index access', () => {
      expect(evaluate(testData, 'orders[0].product')).toBe('Widget');
    });

    test('last element with negative index', () => {
      expect(evaluate(testData, 'tags[2]')).toBe('featured');
    });

    test('slice', () => {
      const result = evaluate(testData, 'orders[0:2]') as any[];
      expect(result).toHaveLength(2);
      expect(result[0].product).toBe('Widget');
    });

    test('spread access maps property', () => {
      expect(evaluate(testData, 'orders[*].product')).toEqual(['Widget', 'Gadget', 'Gizmo']);
    });

    test('filter', () => {
      const result = evaluate(testData, 'orders[? status == "shipped"]') as any[];
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    test('filter followed by property access maps automatically', () => {
      expect(evaluate(testData, 'orders[? status == "shipped"].product')).toEqual([
        'Widget',
        'Gizmo',
      ]);
    });

    test('filter followed by nested property access', () => {
      const data = {
        items: [
          { info: { name: 'A' }, active: true },
          { info: { name: 'B' }, active: false },
          { info: { name: 'C' }, active: true },
        ],
      };
      expect(evaluate(data, 'items[? active].info.name')).toEqual(['A', 'C']);
    });

    test('slice followed by property access maps automatically', () => {
      expect(evaluate(testData, 'orders[0:2].product')).toEqual(['Widget', 'Gadget']);
    });

    test('slice followed by nested property access', () => {
      const data = {
        items: [{ info: { name: 'A' } }, { info: { name: 'B' } }, { info: { name: 'C' } }],
      };
      expect(evaluate(data, 'items[0:2].info.name')).toEqual(['A', 'B']);
    });
  });

  describe('Arithmetic', () => {
    test('multiplication', () => {
      expect(evaluate(testData, 'orders[0].price * orders[0].quantity')).toBeCloseTo(51.98);
    });

    test('operator precedence', () => {
      expect(evaluate(testData, '100 + 50 * 2')).toBe(200);
    });

    test('parentheses', () => {
      expect(evaluate(testData, '(100 + 50) * 2')).toBe(300);
    });
  });

  describe('String Operations', () => {
    test('concatenation with &', () => {
      expect(evaluate(testData, 'user.firstName & " " & user.lastName')).toBe('John Doe');
    });

    test('template literal', () => {
      expect(evaluate(testData, '`Hello ${user.firstName}!`')).toBe('Hello John!');
    });
  });

  describe('Logical Operations', () => {
    test('comparison', () => {
      expect(evaluate(testData, 'user.age >= 18')).toBe(true);
    });

    test('and', () => {
      expect(evaluate(testData, 'user.age > 30 && user.age < 40')).toBe(true);
    });

    test('or', () => {
      expect(evaluate(testData, 'user.age < 20 || user.age > 30')).toBe(true);
    });
  });

  describe('Null Handling', () => {
    test('null coalescing with existing value', () => {
      expect(evaluate(testData, 'user.firstName ?? "Anonymous"')).toBe('John');
    });

    test('null coalescing with missing value', () => {
      expect(evaluate(testData, 'user.nickname ?? "Anonymous"')).toBe('Anonymous');
    });
  });

  describe('Ternary', () => {
    test('true condition', () => {
      expect(evaluate(testData, 'user.age >= 18 ? "Adult" : "Minor"')).toBe('Adult');
    });

    test('false condition', () => {
      expect(evaluate(testData, 'user.age >= 50 ? "Senior" : "Not senior"')).toBe('Not senior');
    });
  });

  describe('Pipe Operations', () => {
    test('single pipe', () => {
      expect(evaluate(testData, 'user.firstName | upper')).toBe('JOHN');
    });

    test('chained pipes', () => {
      expect(evaluate({}, '"  HELLO  " | lower | trim')).toBe('hello');
    });
  });

  describe('Pipe Property Access (jq-style)', () => {
    test('.field after pipe', () => {
      const result = evaluate({}, '{ name: "test" } | .name');
      expect(result).toBe('test');
    });

    test('.[index] after pipe', () => {
      const result = evaluate({}, '[1, 2, 3] | .[1]');
      expect(result).toBe(2);
    });

    test('[index] after pipe (without dot)', () => {
      const result = evaluate({}, '[1, 2, 3] | [1]');
      expect(result).toBe(2);
    });

    test('chain pipe property access', () => {
      const result = evaluate({}, '{ items: [{ x: 1 }] } | .items | .[0] | .x');
      expect(result).toBe(1);
    });

    test('method call on pipe context', () => {
      const result = evaluate({}, '"hello" | .toUpperCase()');
      expect(result).toBe('HELLO');
    });

    test('mix function pipes with property access', () => {
      const result = evaluate({}, '"  hello  " | trim | .toUpperCase()');
      expect(result).toBe('HELLO');
    });

    test('access nested property with data', () => {
      const result = evaluate(testData, 'orders.find(x => x.id === 3) | .status');
      expect(result).toBe('shipped');
    });

    test('access first element then property', () => {
      const result = evaluate(testData, 'orders | .[0] | .product');
      expect(result).toBe('Widget');
    });

    test('split and access index', () => {
      const result = evaluate({}, '"hello" | .split("") | .[0]');
      expect(result).toBe('h');
    });

    test('chain multiple method calls', () => {
      const result = evaluate({}, '"hello world" | .split(" ") | .[0] | .toUpperCase()');
      expect(result).toBe('HELLO');
    });

    test('pipe property access followed by function pipe', () => {
      const result = evaluate(testData, 'user | .firstName | upper');
      expect(result).toBe('JOHN');
    });

    test('nested object access via pipe', () => {
      const result = evaluate(testData, 'user | .address | .city');
      expect(result).toBe('New York');
    });

    test('function pipe with index access', () => {
      const result = evaluate({}, '"a,b,c" | split(",")[1]');
      expect(result).toBe('b');
    });

    test('chained pipe property then function with index', () => {
      const result = evaluate(testData, 'orders.find(x => x.id === 1) | .status | split(" ")[0]');
      expect(result).toBe('shipped');
    });

    test('function pipe with slice access', () => {
      const result = evaluate({}, '[1,2,3,4,5] | take(4)[1:3]');
      expect(result).toEqual([2, 3]);
    });

    test('pipe to object construction', () => {
      const result = evaluate(testData, 'orders[0] | { id: .id, name: .product }');
      expect(result).toEqual({ id: 1, name: 'Widget' });
    });

    test('pipe to object with spread', () => {
      const result = evaluate(testData, 'orders[0] | { ..., extra: "new" }') as any;
      expect(result.id).toBe(1);
      expect(result.product).toBe('Widget');
      expect(result.extra).toBe('new');
    });

    test('pipe to object with nested pipe', () => {
      const result = evaluate(testData, 'orders[0] | { id: .id, upper: .status | upper }');
      expect(result).toEqual({ id: 1, upper: 'SHIPPED' });
    });

    test('pipe to object with arithmetic', () => {
      const result = evaluate(testData, 'orders[0] | { doubled: .price * 2 }');
      expect(result).toEqual({ doubled: 51.98 });
    });

    test('pipe to empty object', () => {
      const result = evaluate(testData, 'orders[0] | {}');
      expect(result).toEqual({});
    });

    test('pipe to object with shorthand property', () => {
      const result = evaluate(testData, 'orders[0] | { id }');
      expect(result).toEqual({ id: 1 });
    });

    test('pipe to object with shorthand and regular properties', () => {
      const result = evaluate(testData, 'orders[0] | { id, name: .product }');
      expect(result).toEqual({ id: 1, name: 'Widget' });
    });

    test('pipe to object with literal value', () => {
      const result = evaluate(testData, 'orders[0] | { "status": "custom" }');
      expect(result).toEqual({ status: 'custom' });
    });

    test('pipe to array with shorthand', () => {
      const result = evaluate(testData, 'orders[0] | [id, product]');
      expect(result).toEqual([1, 'Widget']);
    });

    test('pipe to array with dot syntax', () => {
      const result = evaluate(testData, 'orders[0] | [.id, .product, .price]');
      expect(result).toEqual([1, 'Widget', 25.99]);
    });

    test('pipe to empty array', () => {
      const result = evaluate(testData, 'orders[0] | []');
      expect(result).toEqual([]);
    });

    test('pipe index access still works', () => {
      const result = evaluate(testData, 'orders | [0]');
      expect(result).toEqual(testData.orders[0]);
    });

    test('pipe index access with chaining', () => {
      const result = evaluate(testData, 'orders | [1] | .product');
      expect(result).toBe('Gadget');
    });
  });

  describe('Object Construction', () => {
    test('simple object', () => {
      expect(evaluate(testData, '{ name: user.firstName, city: user.address.city }')).toEqual({
        name: 'John',
        city: 'New York',
      });
    });

    test('with template literal', () => {
      expect(evaluate(testData, '{ fullName: `${user.firstName} ${user.lastName}` }')).toEqual({
        fullName: 'John Doe',
      });
    });
  });

  describe('Arrow Function Implicit Property Access', () => {
    test('.property in arrow resolves to param.property', () => {
      expect(evaluate(testData, 'orders.find(o => .price > 40)')).toEqual({
        id: 2,
        product: 'Gadget',
        price: 49.99,
        quantity: 1,
        status: 'pending',
      });
    });

    test('.property with filter', () => {
      const result = evaluate(testData, 'orders.filter(o => .status === "shipped")') as any[];
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    test('.property with map', () => {
      expect(evaluate(testData, 'orders.map(o => .product)')).toEqual([
        'Widget',
        'Gadget',
        'Gizmo',
      ]);
    });

    test('nested .property access', () => {
      const data = {
        items: [{ info: { name: 'A', value: 10 } }, { info: { name: 'B', value: 20 } }],
      };
      expect(evaluate(data, 'items.map(i => .info.name)')).toEqual(['A', 'B']);
    });

    test('.[index] in arrow', () => {
      const data = {
        arrays: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      };
      expect(evaluate(data, 'arrays.map(a => .[0])')).toEqual([1, 3, 5]);
    });

    test('.method() call in arrow', () => {
      expect(evaluate(testData, 'tags.map(t => .toUpperCase())')).toEqual([
        'ELECTRONICS',
        'SALE',
        'FEATURED',
      ]);
    });

    test('chained .property in arrow', () => {
      expect(evaluate(testData, 'orders.filter(o => .price > 20).map(o => .product)')).toEqual([
        'Widget',
        'Gadget',
      ]);
    });

    test('comparison with .property on both sides', () => {
      const data = {
        items: [
          { a: 5, b: 3 },
          { a: 2, b: 4 },
          { a: 6, b: 6 },
        ],
      };
      expect(evaluate(data, 'items.filter(x => .a > .b)')).toEqual([{ a: 5, b: 3 }]);
    });
  });

  describe('Function Calls', () => {
    test('upper', () => {
      expect(evaluate(testData, 'upper(user.firstName)')).toBe('JOHN');
    });

    test('count', () => {
      expect(evaluate(testData, 'count(orders)')).toBe(3);
    });

    test('sum with spread', () => {
      expect(evaluate(testData, 'sum(orders[*].price)')).toBeCloseTo(90.98);
    });

    test('round', () => {
      expect(evaluate(testData, 'round(orders[0].price, 1)')).toBe(26);
    });
  });

  describe('Map Transform', () => {
    test('basic map transform', () => {
      const result = evaluate(testData, 'orders[*].{ id, total: price * quantity }') as any[];
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
      const result = evaluate(testData, expr) as any;
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
      const code = toJS('user.firstName | upper');
      expect(code).toContain('__helpers.upper');
      expect(code).toContain('input?.user?.firstName');
    });
  });

  describe('Strict Mode - Enhanced Error Messages', () => {
    test('throws descriptive error for missing property', () => {
      expect(() => {
        evaluate(testData, 'user.missing', { strict: true });
      }).toThrow(/does not exist/);
    });

    test('throws error for null access', () => {
      expect(() => {
        evaluate(testData, 'user.nickname.length', { strict: true });
      }).toThrow();
    });

    test('suggests similar property names (typo detection)', () => {
      try {
        evaluate(testData, 'user.adress', { strict: true });
        expect(true).toBe(false); // Should have thrown
      } catch (err: any) {
        expect(err.message).toContain('adress');
        expect(err.suggestions).toContain('address');
      }
    });

    test('throws error for array index out of bounds', () => {
      expect(() => {
        evaluate(testData, 'orders[999]', { strict: true });
      }).toThrow(/out of bounds/);
    });

    test('throws error when accessing non-array with spread', () => {
      expect(() => {
        evaluate(testData, 'user[*]', { strict: true });
      }).toThrow(/array/);
    });

    test('includes path in error for nested access', () => {
      try {
        evaluate(testData, 'user.address.missing', { strict: true });
        expect(true).toBe(false); // Should have thrown
      } catch (err: any) {
        expect(err.path).toContain('address');
      }
    });

    test('forgiving mode still returns undefined', () => {
      // Same expressions should work in forgiving mode
      expect(evaluate(testData, 'user.missing')).toBeUndefined();
      expect(evaluate(testData, 'user.nickname.length')).toBeUndefined();
      expect(evaluate(testData, 'user.adress')).toBeUndefined();
    });
  });
});
