# 05 · Data shown while a new request loads

Why: R-C2 (key switch: old data may stay only under the spinner) and R-C3
(same-key reload: data stays dimmed inside the loading overlay). Scenarios: B2
(R-C2, "a block that is not loading never shows the previous customer") and B3
(R-C3, "a same-key reload keeps the content, dimmed").

Paths are relative to the repo root. Pass/fail is taken from each
`test_report.md` (run 2026-11-19); code reading gives the answers only.

## Per approach

### 05 · vanilla

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Key switch (another customer) | `blank` | `src/app/components/contesters/vanilla-rxjs/data/vm.ts:17` "if (s.data === null) return { state: s.fetching ? { kind: 'loading' } : IDLE, data: null };" |
| Q2 Same-key reload | `kept dimmed` | `src/app/components/contesters/vanilla-rxjs/data/query.ts:43` "this.state$.next({ ...before, fetching: true });" |
| Q3 Sections that differ from Q1/Q2 | customer list (query and page change): `old data under spinner` | `src/app/components/contesters/vanilla-rxjs/data/console.store.ts:226` "keepPrevious<RawCustomerPage>()," |
| Mechanism | `helper (13)` | `src/app/components/contesters/vanilla-rxjs/data/query.ts:39-51` |
| Failing scenarios (from report) | none | `vanilla-rxjs/test_report.md` (0 of 102 unit, 0 of 104 e2e) |

Notes:
- A key switch creates a new entry with no data (`query.ts:14` `data: null`) and `console.store.ts:238` switches to it.
- `keepPrevious` (`vm.ts:28`) keeps the previous page under the spinner on any customer-list query change, paging included.
- Catalog search is `blank` on text change (`console.store.ts:437`, no `keepPrevious`).

### 05 · signal-store

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Key switch (another customer) | `blank` | `src/app/components/contesters/ngrx-signal-store/data/entity-store.ts:141` "return computed((): Fetched<V> => cache.peek()(id()) ?? fetched.loading());" |
| Q2 Same-key reload | `kept dimmed` | `src/app/components/contesters/ngrx-signal-store/data/entity-store.ts:41` "const hadValue = store.values()[id] !== undefined;" |
| Q3 Sections that differ from Q1/Q2 | `none` | `src/app/components/contesters/ngrx-signal-store/components/customers/customer-list/customer-list-section.component.ts:67` "private readonly fetched = cacheEntry(this.cache, this.key);" |
| Mechanism | `helper (19)` | `src/app/components/contesters/ngrx-signal-store/data/entity-store.ts:40-59` |
| Failing scenarios (from report) | none | `ngrx-signal-store/test_report.md` (B2, B3 pass; its failures A2, B10, C7, C11, C12, D7 are not in this criterion) |

Notes:
- The customer list key is the whole query JSON, page included (`ngrx-signal-store/data/ui-state.ts:42`), so text, filter and page changes all start from `blank`.
- Catalog search is also `blank` on text change (`components/panels/order-panel/order-panel-section.component.ts:119` `cacheEntryOptional`).
- A same-key reload after an order save calls `ordersCache.reload` (`order-panel-section.component.ts:154`) and shows `reloading` (`entity-store.ts:112`).

### 05 · resources

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Key switch (another customer) | `blank` | `node_modules/@angular/core/fesm2022/_resource-chunk.mjs:189` "stream: previous.value.extRequest.request === extRequest.request ? previous.value.stream : undefined" |
| Q2 Same-key reload (write-driven refetch) | `blank` | `src/app/components/contesters/resources/components/customers/customer-detail/tabs/orders-tab/orders-tab-section.component.ts:43` "const v = this.bus.orders();" |
| Q3 Sections that differ from Q1/Q2 | `kept dimmed`: activity poll (`resources/components/customers/customer-detail/rail/activity/activity-section.component.ts:46`), notes after add (`.../tabs/notes-tab/notes-tab-section.component.ts:48`), notifications poll and mark-read (`resources/components/notifications/notifications-section.component.ts:44`, `:50`). `blank` on version bump: orders tab, KPI strip (`.../fields/kpi/kpi.component.ts:41`), shipments rail (`.../rail/shipments/shipments-section.component.ts:44`), tickets tab (`.../tabs/tickets-tab/tickets-tab-section.component.ts:43`), open tickets (`.../fields/open-tickets/open-tickets.component.ts:42`), linked tickets (`resources/components/panels/order-panel/order-panel-section.component.ts:76`), product stock and hit stock (`.../product-stock/product-stock.component.ts:30`, `.../hit-add/hit-add.component.ts:46`). `blank` on customer-list query or page change (`resources/data/ui-state.ts:36`) and on catalog search text change (`order-panel-section.component.ts:99`) | `src/app/components/contesters/resources/components/customers/customer-detail/rail/activity/activity-section.component.ts:46` ".subscribe(() => this.res().reload());" |
| Mechanism | `built in` (Angular `rxResource`: `reload()` keeps the value, a new `params` clears it) | `node_modules/@angular/core/fesm2022/_resource-chunk.mjs:175-192` |
| Failing scenarios (from report) | B3 | `resources/test_report.md:17` "expected 'loading' to be 'reloading'" (unit); `:321` (e2e) |

Notes:
- A write bumps `Bus.orders` (`order-panel-section.component.ts:120`), which changes the registry key `${id}:${version}` (`resources/data/orders.registry.ts:28`); the old resource is no longer read, so the orders tab starts from `loading` with no value.
- Dimmed on reload: `content/resource-block/resource-block.component.html:5` `[class.loading]="resource.isLoading()"`; `isLoading` is true for `reloading` (`_resource-chunk.mjs:112`).
- The shared resources are keyed by customer id, so switching customer blanks every customer-keyed section (`orders-tab-section.component.ts:27`).

### 05 · stateful-observable

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Key switch (another customer) | `old data under spinner` | `src/app/components/contesters/stateful-observable/components/customers/customer-detail/tabs/orders-tab/orders-tab-section.component.ts:28` "[orders]=\"orders.value$ \| async\"" |
| Q2 Same-key reload | `kept dimmed` | `src/app/components/content/stateful-block/stateful-block.component.html:5` "[class.loading]=\"stream.pending$ \| async\"" |
| Q3 Sections that differ from Q1/Q2 | `none` (every keyed section reads `value$ \| async`) | `src/app/components/contesters/stateful-observable/components/customers/customer-list/customer-list-section.component.ts:41` "[page]=\"page.value$ \| async\"" |
| Mechanism | `built in` (library `value$` / `pending$`) | `src/app/submodules/stateful-observable/src/fillStatefulObservable.ts:114-130` |
| Failing scenarios (from report) | none | `stateful-observable/test_report.md` (0 of 102 unit, 0 of 104 e2e) |

Notes:
- The key switch uses the default `switchMap` (`src/app/submodules/stateful-observable/src/factory.ts:298`); the new key's loading event carries no value, and `value$` filters it out (`fillStatefulObservable.ts:114`), so the previous value stays under the spinner.
- If the new key fails, the block shows the error instead of the content (`stateful-block.component.html:6-12`), so old data is not shown after loading stops.
- Catalog search keeps the previous hits under the spinner on text change (`stateful-observable/components/panels/order-panel/order-panel-section.component.ts:59`).

## Side by side

| Approach | Q1 Key switch | Q2 Same-key reload | Q3 Exceptions | Failing scenarios |
| --- | --- | --- | --- | --- |
| vanilla | `blank` | `kept dimmed` | customer list: `old data under spinner` | none |
| signal-store | `blank` | `kept dimmed` | none | none (in this criterion) |
| resources | `blank` | `blank` (write-driven and version-keyed sections) | `kept dimmed` for activity poll, notes add, notifications; `blank` for list and search changes | B3 |
| stateful-observable | `old data under spinner` | `kept dimmed` | none | none |

## Verdict

- On a key switch, vanilla, signal-store and resources blank the customer sections (Side by side, Q1 column); stateful-observable keeps the previous value under the spinner in every keyed section (stateful-observable Q1). B2 passes for all four.
- On a same-key reload, vanilla, signal-store and stateful-observable keep the content dimmed (Q2 column). Resources blanks the write-driven reload (resources Q2) and keeps it dimmed only for its timer and note-add reloads (resources Q3).
- B3 fails only for resources (`resources/test_report.md:17`); its orders tab is `blank` on a write (resources Q2), because the write changes the registry key.
- Vanilla's customer list (vanilla Q3) keeps the previous page under the spinner on a page change; signal-store and resources blank it (their keys include the page: `ngrx-signal-store/data/ui-state.ts:42`, `resources/data/ui-state.ts:36`). No scenario in the reports checks a page change for dimming (only B3 asserts `reloading`), so this is recorded as a fact, not a failure.
