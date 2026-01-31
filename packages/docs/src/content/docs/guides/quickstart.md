---
title: Quick Start
description: Get up and running with JSON Transformer in minutes.
---

# Quick Start

## Installation

```bash
npm install @ahsankhanamu/json-transformer
```

## Basic Examples

```javascript
import { evaluate } from '@ahsankhanamu/json-transformer';

const data = {
  user: { name: 'John', age: 30 },
  orders: [
    { product: 'Widget', price: 25.99, status: 'shipped' },
    { product: 'Gadget', price: 49.99, status: 'pending' }
  ]
};

// Property access
evaluate('user.name', data);                    // "John"

// Array projection
evaluate('orders[].product', data);             // ["Widget", "Gadget"]

// Filtering
evaluate('orders[? .status == "shipped"]', data);

// Sorting
evaluate('orders[].sort(.price)', data);

// Transformations
evaluate('user.name | upper', data);            // "JOHN"
```

## Object Construction

```javascript
evaluate(`{
  fullName: user.name,
  totalValue: orders[].price | sum
}`, data);
// { fullName: "John", totalValue: 75.98 }
```

## Variable Bindings

```javascript
evaluate(`
  let total = price * quantity;
  let tax = total * 0.1;
  { subtotal: total, tax, grandTotal: total + tax }
`, { price: 100, quantity: 2 });
// { subtotal: 200, tax: 20, grandTotal: 220 }
```

## Interactive Playground

Try JSON Transformer in the browser with the interactive playground:

```bash
cd packages/playground
npm install
npm run dev
```

Open http://localhost:5173 to start experimenting.
