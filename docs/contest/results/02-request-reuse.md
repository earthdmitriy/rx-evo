# 02 · Sharing one request per key

Run 2026-11-19 reports (`test_report.md` of each approach). Code read at this commit.
Paths relative to `src/app/components/contesters/` unless shown in full. Line counts are
non-blank, non-comment lines of Prettier output (`tools/contest/metrics.mjs` rule); the
cited range is the source range.

## Per approach

### 02 · vanilla
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Two consumers of the same key share one request | yes | `vanilla-rxjs/data/query.ts:101` "const entry = this.entry(arg);" (entity caches: `vanilla-rxjs/data/entity-cache.ts:95`) |
| Q2 What the key is | queries: `JSON.stringify(a ?? null)`; entity caches: the raw id | `vanilla-rxjs/data/query.ts:150` "return (this.opts.id ?? ((a: A) => JSON.stringify(a ?? null)))(arg);" |
| Q3 Cache scope | signed-in session: 17 user caches (14 queries, `agents`, `tiers`, `ticketCounts`); app: 4 public (`searchProducts`, `products`, `prices`, `stock`) | `vanilla-rxjs/data/sources.ts:140` "// products, prices and stock are public: kept across sessions." |
| Q4 What drops a held value | `logout` (the 17 user caches, `clearSession`); `never` (the 4 public); no size bound; a settled value survives its last unsubscribe | `vanilla-rxjs/data/sources.ts:122-139`; `vanilla-rxjs/data/query.ts:70` "if (this.state$.value.fetching) {" (only an in-flight request is cancelled) |
| Q5 Old keys kept after the key changes | yes (they stay until Q4) | `vanilla-rxjs/data/query.ts:90` "private readonly entries = new Map<string, Entry<A, T>>();" |
| Mechanism | helper (250) | `vanilla-rxjs/data/query.ts:27-162` (Entry 56, Query 54); `vanilla-rxjs/data/entity-cache.ts:8-176` (Slot 9, EntityCache 131) |
| Failing scenarios (from report) | none | `vanilla-rxjs/test_report.md` (unit 0 of 102 failed; e2e 0 of 104 failed) |

Notes: Products, prices, stock and product search are never cleared (`sources.ts:88-89`, `107-113`).
A new observer of a settled key gets the value with no request (`query.ts:59-62`, `entity-cache.ts:46-54`).
The per-key map is the `entries` Map (queries) and the `slots` Map (entities); neither is ever shrunk except by `clear()`.

### 02 · ngrx-signal-store
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Two consumers of the same key share one request | yes | `ngrx-signal-store/data/entity-store.ts:66` "if (!slot \|\| slot.status === 'error') run(id).subscribe();" |
| Q2 What the key is | the id as passed (numbers, sku strings); `CUSTOMERS_PAGE` takes the query string `JSON.stringify(store.query())` | `ngrx-signal-store/data/ui-state.ts:42` "queryKey: computed(() => JSON.stringify(store.query()))," |
| Q3 Cache scope | signed-in session: 17 caches in `SESSION_CACHES`; app: 4 public, not in that list (`SEARCH_PRODUCTS`, `PRODUCT_NAME`, `PRICE`, `STOCK`) | `ngrx-signal-store/data/sources.ts:139` "export const SESSION_CACHES = [" |
| Q4 What drops a held value | `logout` (the 17 session caches, `auth.ts:25`); `never` (the 4 public); no size bound; a loaded value survives its last unsubscribe | `ngrx-signal-store/data/entity-store.ts:85` "if (store.values()[id] !== undefined) patchState(store, setEntity<Slot>({ id, status: 'ready' }));" |
| Q5 Old keys kept after the key changes | yes (they stay until Q4) | `ngrx-signal-store/data/entity-store.ts:50` "patchState(store, (s) => ({ values: { ...s.values, [id]: value } }));" |
| Mechanism | helper (81) | `ngrx-signal-store/data/entity-store.ts:25-116` (`createKeyedCache`) |
| Failing scenarios (from report) | C7 | `ngrx-signal-store/test_report.md` (unit 6 of 102 failed, e2e 6 of 104; C7 in both) |

Notes: C7 fails on the `prices` count (4 calls, expected 1): a batching miss, not a sharing miss (`ngrx-signal-store/test_report.md`, C7 detail).
`clear()` (`entity-store.ts:96-101`) empties the `values` record and the entity map of each session cache.
`SESSION_CACHES` is the only place that lists the session caches; a cache added there is cleared on logout.

### 02 · resources
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Two consumers of the same key share one request | yes | `resources/data/order-stats.registry.ts:29` "let res = this.byKey.get(key);" |
| Q2 What the key is | versioned: `${id}:${version}` (orders, order stats, stock, ticket counts); unversioned: the raw id (customers, tiers, cart, activity, products, prices); cart prices: `skus.join(',')`; customer list: `JSON.stringify(this.query())` | `resources/data/order-stats.registry.ts:28` "const key = `${id}:${version}`;" |
| Q3 Cache scope | signed-in session: all 12 registries, public ones (`products`, `prices`) included; component: the editor's product search (`rxResource` in the component, no shared map) | `resources/resources-signed-in.component.ts:57` "ProductsRegistry," (providers at `:47-60`); `resources/components/panels/order-panel/order-panel-section.component.ts:98-100` |
| Q4 What drops a held value | `logout` (all 12 registries, the frame's injector is destroyed); `never` otherwise; no size bound; a registry entry is never removed on unsubscribe; search: dropped with its component | `resources/resources-signed-in.component.ts:30` "* injector (and so they) is destroyed on sign-out." |
| Q5 Old keys kept after the key changes | yes (they stay until Q4; old versions of versioned keys too) | `resources/data/order-stats.registry.ts:24` "private readonly byKey = new Map<string, ReturnType<typeof makeOrderStatsResource>>();" |
| Mechanism | per-entity (23-35 × 12) | `resources/data/*.registry.ts`, from the `make…Resource` function to the end of each file (activity 27, cart-prices 35, cart 23, customer-list 27, customers 27, order-stats 28, orders 24, prices 23, products 27, stock 28, ticket-counts 28, tiers 23; total 320) |
| Failing scenarios (from report) | A7, C6, C7 | `resources/test_report.md` (unit and e2e; A7, C6, C7 in both) |

Notes: A7 fails because the public `products` and `prices` registries are in the signed-in frame's `providers` (`resources-signed-in.component.ts:57-58`), so sign-out drops them.
The stock, ticket-count, order and order-stats registries key by write version: a write makes a new key and the old one stays (`order-stats.registry.ts:24`, `:28`).
The 12 registries repeat one shape (`rxResource` per id in a `Map`), so the Mechanism count is per entity.

### 02 · stateful-observable
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Two consumers of the same key share one request | yes | `src/app/submodules/stateful-observable/src/factory.ts:133` "// Entries with consumers are never evicted, so a live stream is not" |
| Q2 What the key is | the argument, JSON-encoded as `[x]` (no `cacheKey` in `sources/lookups.ts`); component nodes: `[query.text, filter, sort, dir, page]` and `[text]` | `src/app/submodules/stateful-observable/src/factory.ts:144` "const keyOf = params.cacheKey ?? ((x: Input) => [x]);" (encoding: `src/app/submodules/stateful-observable/src/cache.ts:30`) |
| Q3 Cache scope | signed-in session: 14 user factories (`active: inject(LOGGED_IN)`); app: 3 public (`PRODUCT_NAME`, `CURRENT_PRICE`, `STOCK_BY_SKU`); component: 2 node caches (customer page, editor product search) | `sources/lookups.ts:51` "active: inject(LOGGED_IN)," |
| Q4 What drops a held value | `logout` (14 user, via `active`: kept values are forgotten on the first `false`); size bound: 200 (5 user factories), 42 (9 user, library default), 500 (3 public); a completed value is kept after its last subscriber leaves | `src/app/submodules/stateful-observable/src/factory.ts:157` "// Kept values may belong to the previous user, so they are dropped on the" (default bound: `src/app/submodules/stateful-observable/src/factory.ts:138`) |
| Q5 Old keys kept after the key changes | yes (they stay until Q4; unobserved entries beyond the bound are evicted) | `src/app/submodules/stateful-observable/src/factory.ts:137` "const cache = createCache<Entry>(" (eviction loop: `src/app/submodules/stateful-observable/src/cache.ts:60-68`) |
| Mechanism | built in (`cacheSize` is configuration on 8 of 17 factories) | `src/app/submodules/stateful-observable/src/factory.ts:137-144` (library; no line count); approach code: `sources/lookups.ts:42-43` (`lookup` helper, 2 lines) |
| Failing scenarios (from report) | none | `stateful-observable/test_report.md` (unit 0 of 102 failed; e2e 0 of 104 failed) |

Notes: `cacheSize` is set on `lookups.ts:52, 65, 74, 95, 154` (200), `192, 205, 214` (500); the other nine user factories take the default 42 (`factory.ts:138`).
The customer page and the editor's product search are `statefulObservable` nodes in their components (`customer-list-section.component.ts:68-85`, `order-panel-section.component.ts:109-117`), default bound 42 (`src/app/submodules/stateful-observable/src/statefulObservable.ts:119`); they end with the component.
Product search is not in `lookups.ts`: its cache is per component, not per app.

## Side by side

| Approach | Q1 Shared | Q2 Key | Q3 Scope | Q4 Dropped by | Q5 Old keys | Mechanism | Failing (in list) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vanilla | yes | `JSON.stringify(a ?? null)`; raw id | session (17 user); app (4 public) | logout (17); never (4 public); no size bound | yes (until Q4) | helper (250) | none |
| ngrx-signal-store | yes | raw id; customer list: `JSON.stringify(store.query())` | session (17 in `SESSION_CACHES`); app (4 public) | logout (17); never (4 public); no size bound | yes (until Q4) | helper (81) | C7 |
| resources | yes | `${id}:${version}`; raw id; `skus.join(',')`; `JSON.stringify(query)` | session (12 registries, public included); component (product search) | logout (all 12); no size bound; search dropped with component | yes (until Q4; old versions too) | per-entity (23-35 × 12) | A7, C6, C7 |
| stateful-observable | yes | JSON of the argument, `[x]` | session (14 user); app (3 public); component (2 nodes) | logout (14, via `active`); size bound 200 (5) / 42 (9) / 500 (3); component nodes end with the component | yes (until Q4; unobserved beyond bound evicted) | built in (`cacheSize` on 8 of 17) | none |

## Verdict

- All four give one request per key while the value is held: Side by side, Q1 is `yes` in each row.
- vanilla and ngrx-signal-store keep 17 user caches until logout and 4 public ones, with no size bound (Side by side, Q3 and Q4).
- resources holds 12 registries in the signed-in frame, public products and prices included, and drops all 12 at logout; its product search is a component `rxResource` (Side by side, Q3 and Q4).
- stateful-observable bounds its 17 factories: 200 on 5 user, 42 on 9 user, 500 on 3 public; its two component-held caches end with the component (Side by side, Q4 and Q3).
- Failing scenarios in this criterion's list: resources A7, C6, C7; ngrx-signal-store C7 (price batching, not key sharing); vanilla and stateful-observable none (Side by side, Failing column).
