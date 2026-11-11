# Test report: signal-store

Run 2026-11-19T08:58:44.143Z. Seed 1.

- Unit: page tests with `PAGE_TARGET=signal-store` (`src/app/components/contesters/page-tests`).
- E2E: `E2E_CONTESTER=signal-store` (`e2e/specs`).

## Unit (failed)

6 failed of 102.

| Scenario | Stage | Test | Message |
| --- | --- | --- | --- |
| A2 | 3 | sign in starts profile, notifications and customers in parallel, once each | AssertionError: expected { profile: 1, notifications: 1, …(4) } to deeply equal { profile: 1, notifications: 1, …(4) } at D:/Win/Projects/rx-evo/src/app/compone |
| B10 | 3 | the editor search is debounced: one search, one batch of prices, stock once per hit | AssertionError: expected 4 to be less than or equal to 1 at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/b-change.spec.ts:167:25 |
| C7 | 3 | the editor requests nothing until a text is typed, and remembers searches | AssertionError: expected { searchProducts: 1, prices: 4, …(1) } to deeply equal { searchProducts: 1, prices: 1, …(1) } at D:/Win/Projects/rx-evo/src/app/compone |
| C11 | 3 | a list page asks tiers and counters once, for all its rows | AssertionError: expected 8 to be 1 // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/c-cache.spec.ts:163:26 |
| C12 | 3 | the prices of a long cart are asked in batches of 20 (names one by one) | AssertionError: expected 24 to be 2 // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/c-cache.spec.ts:180:31 |
| D7 | 3 | a hit shows its name first, then its price and stock as they arrive | AssertionError: expected false to be true // Object.is equality at D:/Win/Projects/rx-evo/src/app/components/contesters/page-tests/d-progressive.spec.ts:93:55 |

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
AssertionError: expected 24 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 24

 ❯ src/app/components/contesters/page-tests/c-cache.spec.ts:180:31
    178|     const priceCalls = c.calls<string[]>('prices');
    179|     expect(priceCalls.every((ids) => ids.length <= 20)).toBe(true);
    180|     expect(priceCalls.length).toBe(Math.ceil(priceCalls.flat().length …
       |                               ^
    181|     expect(priceCalls.flat().length).toBe(lines);
    182|     expect(c.stats('prices').errors).toBe(0);
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

## E2E (failed)

6 failed of 104.

| Scenario | Stage | Test | Message |
| --- | --- | --- | --- |
| A2 | 3 | sign in starts profile, notifications and customers in parallel, once each | Error: expect(received).toEqual(expected) // deep equality - Expected  - 2 |
| B10 | 3 | the editor search is debounced: one search, one batch of prices, stock once per hit | Error: expect(received).toBeLessThanOrEqual(expected) Expected: <= 1 |
| C7 | 3 | the editor requests nothing until a text is typed, and remembers searches | Error: expect(received).toEqual(expected) // deep equality - Expected  - 1 |
| C11 | 3 | a list page asks tiers and counters once, for all its rows | Error: expect(received).toBe(expected) // Object.is equality Expected: 1 |
| C12 | 3 | the prices of a long cart are asked in batches of 20 (names one by one) | Error: expect(received).toBe(expected) // Object.is equality Expected: 2 |
| D7 | 3 | a hit shows its name first, then its price and stock as they arrive | Error: hit-price should be shown hit-price should be shown |

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

#### B10 · stage 3 · the editor search is debounced: one search, one batch of prices, stock once per hit

```text
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    4
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

#### C11 · stage 3 · a list page asks tiers and counters once, for all its rows

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 8
```

#### C12 · stage 3 · the prices of a long cart are asked in batches of 20 (names one by one)

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 24
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
