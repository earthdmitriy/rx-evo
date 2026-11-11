# Test report: resources

Run 2026-11-19T08:58:44.143Z. Seed 1.

- Unit: page tests with `PAGE_TARGET=resources` (`src/app/components/contesters/page-tests`).
- E2E: `E2E_CONTESTER=resources` (`e2e/specs`).

## Unit (failed)

14 failed of 102.

| Scenario | Stage | Test | Message |
| --- | --- | --- | --- |
| A2 | 3 | sign in starts profile, notifications and customers in parallel, once each | AssertionError: expected { profile: 1, notifications: 1, …(4) } to deeply equal { profile: 1, notifications: 1, …(4) } at D:/Win/Projects/rx-evo/src/app/compone |
| A7 | 3 | products and prices survive logout | AssertionError: expected { cart: 1, product: +0, prices: 2 } to deeply equal { cart: 1, product: +0, prices: +0 } at D:/Win/Projects/rx-evo/src/app/components/c |
| B1 | 2 | superseded customer reads are cancelled | AssertionError: expected 0 to be greater than or equal to 1 at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/b-change.spec.ts:106:43 |
| B3 | 2 | a same-key reload keeps the content, dimmed | AssertionError: expected 'loading' to be 'reloading' // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/b-change.spec.ts:1 |
| B10 | 3 | the editor search is debounced: one search, one batch of prices, stock once per hit | AssertionError: expected 4 to be less than or equal to 1 at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/b-change.spec.ts:167:25 |
| C6 | 3 | an order opened again comes from cache | AssertionError: expected 'loading' to be 'ready' // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/c-cache.spec.ts:82:36 |
| C7 | 3 | the editor requests nothing until a text is typed, and remembers searches | AssertionError: expected { searchProducts: 1, prices: 4, …(1) } to deeply equal { searchProducts: 1, prices: 1, …(1) } at D:/Win/Projects/rx-evo/src/app/compone |
| C9 | 3 | polls run only for what is shown | AssertionError: expected { activity: +0, orderStats: +0, …(1) } to deeply equal { activity: +0, orderStats: +0, …(1) } at D:/Win/Projects/rx-evo/src/app/compone |
| C11 | 3 | a list page asks tiers and counters once, for all its rows | AssertionError: expected 8 to be 1 // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/c-cache.spec.ts:163:26 |
| C12 | 3 | the prices of a long cart are asked in batches of 20 (names one by one) | AssertionError: expected 26 to be 3 // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/c-cache.spec.ts:180:31 |
| C16 | 3 | an order change refreshes the stock of the skus it touches, and only those | AssertionError: expected [ 'TE-2184', 'ZA-2702', 'AM-2776' ] to deeply equal [] at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/c-cache.spec. |
| D7 | 3 | a hit shows its name first, then its price and stock as they arrive | AssertionError: expected false to be true // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/d-progressive.spec.ts:93:55 |
| D9 | 3 | a cart line shows its price while its name is on the way | AssertionError: expected false to be true // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/d-progressive.spec.ts:126:54 |
| E7 | 2 | a failed poll keeps the entries | AssertionError: expected 'error' to be 'ready' // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/e-enrichment.spec.ts:58: |

### Unit details

#### A2 · stage 3 · sign in starts profile, notifications and customers in parallel, once each

```text
AssertionError: expected { profile: 1, notifications: 1, …(4) } to deeply equal { profile: 1, notifications: 1, …(4) }

- Expected
+ Received

  {
    "customer": 0,
    "customers": 1,
    "notifications": 1,
    "profile": 1,
-   "ticketCounts": 1,
-   "tiers": 1,
+   "ticketCounts": 8,
+   "tiers": 8,
  }

 ❯ src/app/components/contesters/page-tests/a-session.spec.ts:96:100
     94|     expect(c.pending('customers').length).toBe(1);
     95|     await c.settle();
     96|     expect(c.totals('profile', 'notifications', 'customers', 'tiers', …
       |                                                                                                    ^
     97|       profile: 1, notifications: 1, customers: 1, tiers: 1, ticketCoun…
     98|     });
```

#### A7 · stage 3 · products and prices survive logout

```text
AssertionError: expected { cart: 1, product: +0, prices: 2 } to deeply equal { cart: 1, product: +0, prices: +0 }

- Expected
+ Received

  {
    "cart": 1,
-   "prices": 0,
+   "prices": 2,
    "product": 0,
  }

 ❯ src/app/components/contesters/page-tests/a-session.spec.ts:120:51
    118|     await c.settle();
    119|     expect(c.state('tab-cart')).toBe('ready');
    120|     expect(c.totals('cart', 'product', 'prices')).toEqual({ cart: 1, p…
       |                                                   ^
    121|   });
    122| });
```

#### B1 · stage 2 · superseded customer reads are cancelled

```text
AssertionError: expected 0 to be greater than or equal to 1
 ❯ src/app/components/contesters/page-tests/b-change.spec.ts:106:43
    104|     await c.selectCustomer(b.id, b.name);
    105|     await c.idle(200);
    106|     expect(c.stats('customer').cancelled).toBeGreaterThanOrEqual(1);
       |                                           ^
    107|   });
    108|
```

#### B3 · stage 2 · a same-key reload keeps the content, dimmed

```text
AssertionError: expected 'loading' to be 'reloading' // Object.is equality

Expected: "reloading"
Received: "loading"

 ❯ src/app/components/contesters/page-tests/b-change.spec.ts:116:35
    114|     await c.click('close-panel');
    115|     await c.tab('orders');
    116|     expect(c.state('tab-orders')).toBe('reloading');
       |                                   ^
    117|     expect(c.shown(`order-${fx.editable.orderId}`).length).toBe(1);
    118|     await c.settle();
```

#### B10 · stage 3 · the editor search is debounced: one search, one batch of prices, stock once per hit

```text
AssertionError: expected 4 to be less than or equal to 1
 ❯ src/app/components/contesters/page-tests/b-change.spec.ts:167:25
    165|     expect(c.total('searchProducts')).toBe(1);
    166|     const t = c.totals('prices', 'stock');
    167|     expect(t['prices']).toBeLessThanOrEqual(1);
       |                         ^
    168|     // stock has no batch endpoint: one call per hit of the one search…
    169|     const hits = c.truth<unknown[]>('searchProducts', fx.editable.addN…
```

#### C6 · stage 3 · an order opened again comes from cache

```text
AssertionError: expected 'loading' to be 'ready' // Object.is equality

Expected: "ready"
Received: "loading"

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:82:36
     80|     c.resetStats();
     81|     await c.openOrder(fx.editable.orderId);
     82|     expect(c.state('order-panel')).toBe('ready');
       |                                    ^
     83|     await c.idle(200);
     84|     expect(c.totals('order', 'ticketsByOrder', 'product')).toEqual({ o…
```

#### C7 · stage 3 · the editor requests nothing until a text is typed, and remembers searches

```text
AssertionError: expected { searchProducts: 1, prices: 4, …(1) } to deeply equal { searchProducts: 1, prices: 1, …(1) }

- Expected
+ Received

  {
-   "prices": 1,
+   "prices": 4,
    "searchProducts": 1,
    "stock": 4,
  }

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:98:59
     96|     await searchProducts(c, first);
     97|     // prices are one batch; stock has no batch endpoint: one call per…
     98|     expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({ se…
       |                                                           ^
     99|     await searchProducts(c, fx.editable.addName.slice(0, 4));
    100|     c.resetStats();
```

#### C9 · stage 3 · polls run only for what is shown

```text
AssertionError: expected { activity: +0, orderStats: +0, …(1) } to deeply equal { activity: +0, orderStats: +0, …(1) }

- Expected
+ Received

  {
    "activity": 0,
-   "notifications": 2,
+   "notifications": 1,
    "orderStats": 0,
  }

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:121:65
    119|     await c.idle(30_000);
    120|     await c.idle(200);
    121|     expect(c.totals('activity', 'orderStats', 'notifications')).toEqua…
       |                                                                 ^
    122|   });
    123|
```

#### C11 · stage 3 · a list page asks tiers and counters once, for all its rows

```text
AssertionError: expected 8 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 8

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:163:26
    161|     const tiers = c.calls<number[]>('tiers');
    162|     const counts = c.calls<number[]>('ticketCounts');
    163|     expect(tiers.length).toBe(1);
       |                          ^
    164|     expect(counts.length).toBe(1);
    165|     expect([...tiers[0]].sort()).toEqual([...rows].sort());
```

#### C12 · stage 3 · the prices of a long cart are asked in batches of 20 (names one by one)

```text
AssertionError: expected 26 to be 3 // Object.is equality

- Expected
+ Received

- 3
+ 26

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:180:31
    178|     const priceCalls = c.calls<string[]>('prices');
    179|     expect(priceCalls.every((ids) => ids.length <= 20)).toBe(true);
    180|     expect(priceCalls.length).toBe(Math.ceil(priceCalls.flat().length …
       |                               ^
    181|     expect(priceCalls.flat().length).toBe(lines);
    182|     expect(c.stats('prices').errors).toBe(0);
```

#### C16 · stage 3 · an order change refreshes the stock of the skus it touches, and only those

```text
AssertionError: expected [ 'TE-2184', 'ZA-2702', 'AM-2776' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "TE-2184",
+   "ZA-2702",
+   "AM-2776",
+ ]

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:236:54
    234|     const asked = c.calls<string>('stock');
    235|     expect(asked).toContain(fx.editable.addSku);
    236|     expect(asked.filter((sku) => !touched.has(sku))).toEqual([]);
       |                                                      ^
    237|     const hit = c.one('catalog-search')!.querySelector<HTMLElement>(`[…
    238|     expect(c.text('hit-stock', hit)).toContain(String(c.truth<{ stock:…
```

#### D7 · stage 3 · a hit shows its name first, then its price and stock as they arrive

```text
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/app/components/contesters/page-tests/d-progressive.spec.ts:93:55
     91|     await c.release('prices');
     92|     const search = c.one('catalog-search')!;
     93|     expect(c.fieldsAre(search, 'hit-price', 'shown')).toBe(true);
       |                                                       ^
     94|     expect(c.fieldsAre(search, 'hit-stock', 'empty')).toBe(true);
     95|     expect((c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).d…
```

#### D9 · stage 3 · a cart line shows its price while its name is on the way

```text
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/app/components/contesters/page-tests/d-progressive.spec.ts:126:54
    124|     expect(c.fieldsAre(cart, 'line-price', 'shown')).toBe(true);
    125|     expect(c.fieldsAre(cart, 'line-name', 'empty')).toBe(true);
    126|     expect(c.fieldsAre(cart, 'cart-total', 'shown')).toBe(true);
       |                                                      ^
    127|     await c.release('product');
    128|     expect(c.fieldsAre(cart, 'line-name', 'shown')).toBe(true);
```

#### E7 · stage 2 · a failed poll keeps the entries

```text
AssertionError: expected 'error' to be 'ready' // Object.is equality

Expected: "ready"
Received: "error"

 ❯ src/app/components/contesters/page-tests/e-enrichment.spec.ts:58:33
     56|   signedInScenario('E7', 2, 'a failed poll keeps the entries', async (…
     57|     await failActivityPoll(c, fx);
     58|     expect(c.state('activity')).toBe('ready');
       |                                 ^
     59|     expect(c.shown('activity-entry', c.one('activity')!).length).toBeG…
     60|   });
```

## E2E (failed)

14 failed of 104.

| Scenario | Stage | Test | Message |
| --- | --- | --- | --- |
| A2 | 3 | sign in starts profile, notifications and customers in parallel, once each | Error: expect(received).toEqual(expected) // deep equality - Expected  - 2 |
| A7 | 3 | products and prices survive logout | Error: expect(received).toEqual(expected) // deep equality - Expected  - 1 |
| B1 | 2 | superseded customer reads are cancelled | Error: expect(received).toBeGreaterThanOrEqual(expected) Expected: >= 1 |
| B3 | 2 | a same-key reload keeps the content, dimmed | Error: tab-orders state should be reloading tab-orders state should be reloading |
| B10 | 3 | the editor search is debounced: one search, one batch of prices, stock once per hit | Error: expect(received).toBeLessThanOrEqual(expected) Expected: <= 1 |
| C6 | 3 | an order opened again comes from cache | Error: order-panel state should be ready order-panel state should be ready |
| C7 | 3 | the editor requests nothing until a text is typed, and remembers searches | Error: expect(received).toEqual(expected) // deep equality - Expected  - 1 |
| C9 | 3 | polls run only for what is shown | Error: expect(received).toEqual(expected) // deep equality - Expected  - 1 |
| C11 | 3 | a list page asks tiers and counters once, for all its rows | Error: expect(received).toBe(expected) // Object.is equality Expected: 1 |
| C12 | 3 | the prices of a long cart are asked in batches of 20 (names one by one) | Error: expect(received).toBe(expected) // Object.is equality Expected: 3 |
| C16 | 3 | an order change refreshes the stock of the skus it touches, and only those | Error: expect(received).toEqual(expected) // deep equality - Expected  - 1 |
| D7 | 3 | a hit shows its name first, then its price and stock as they arrive | Error: hit-price should be shown hit-price should be shown |
| D9 | 3 | a cart line shows its price while its name is on the way | Error: cart-total should be shown cart-total should be shown |
| E7 | 2 | a failed poll keeps the entries | Error: activity state should be ready activity state should be ready |

### E2E details

#### A2 · stage 3 · sign in starts profile, notifications and customers in parallel, once each

```text
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
    "customer": 0,
    "customers": 1,
    "notifications": 1,
    "profile": 1,
-   "ticketCounts": 1,
-   "tiers": 1,
+   "ticketCounts": 8,
+   "tiers": 8,
  }
```

#### A7 · stage 3 · products and prices survive logout

```text
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "cart": 1,
-   "prices": 0,
+   "prices": 2,
    "product": 0,
  }
```

#### B1 · stage 2 · superseded customer reads are cancelled

```text
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 1
Received:    0
```

#### B3 · stage 2 · a same-key reload keeps the content, dimmed

```text
Error: tab-orders state should be reloading

tab-orders state should be reloading

expect(received).toBe(expected) // Object.is equality

Expected: "ok"
Received: "loading"

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```

#### B10 · stage 3 · the editor search is debounced: one search, one batch of prices, stock once per hit

```text
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    4
```

#### C6 · stage 3 · an order opened again comes from cache

```text
Error: order-panel state should be ready

order-panel state should be ready

expect(received).toBe(expected) // Object.is equality

Expected: "ok"
Received: "loading"

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```

#### C7 · stage 3 · the editor requests nothing until a text is typed, and remembers searches

```text
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
-   "prices": 1,
+   "prices": 4,
    "searchProducts": 1,
    "stock": 4,
  }
```

#### C9 · stage 3 · polls run only for what is shown

```text
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "activity": 0,
-   "notifications": 2,
+   "notifications": 1,
    "orderStats": 0,
  }
```

#### C11 · stage 3 · a list page asks tiers and counters once, for all its rows

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 8
```

#### C12 · stage 3 · the prices of a long cart are asked in batches of 20 (names one by one)

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 3
Received: 26
```

#### C16 · stage 3 · an order change refreshes the stock of the skus it touches, and only those

```text
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 5

- Array []
+ Array [
+   "TE-2184",
+   "ZA-2702",
+   "AM-2776",
+ ]
```

#### D7 · stage 3 · a hit shows its name first, then its price and stock as they arrive

```text
Error: hit-price should be shown

hit-price should be shown

expect(received).toBe(expected) // Object.is equality

Expected: "ok"
Received: "shown,empty,empty,empty"

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```

#### D9 · stage 3 · a cart line shows its price while its name is on the way

```text
Error: cart-total should be shown

cart-total should be shown

expect(received).toBe(expected) // Object.is equality

Expected: "ok"
Received: "empty"

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```

#### E7 · stage 2 · a failed poll keeps the entries

```text
Error: activity state should be ready

activity state should be ready

expect(received).toBe(expected) // Object.is equality

Expected: "ok"
Received: "error"

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```
