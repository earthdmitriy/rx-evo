# 04 · Batching

When several consumers ask for different ids in the same tick, do they go out as
one call (up to `MAX_BATCH` = 20, `src/app/services/contesters/console.types.ts:169`),
or as one call per id?

Requirement: R-L9 (batch services are asked in batches) and R-J3 (batch calls
respect the limit). Batch endpoints: `tiers`, `ticketCounts`, `prices`. Single-id
endpoints (`agent`, `product`, `stock`) are not judged here.
Scenarios: A2, B10, C7, C11, C12, D7.

Paths are relative to `src/app/components/contesters/` unless they start with
`src/`. `LIB` below means `src/app/submodules/stateful-observable/src/`.
Test reports: run 2026-11-19 (`test_report.md` in each approach folder).

## Per approach

### 04 · Vanilla RxJS

| Endpoint | Q1 Ids asked in one tick | Q2 More than 20 ids | Q3 One id fails | Mechanism | Failing scenarios (report) | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| tiers | one call | split into chunks | only that id errors | helper (40) | none | Q1 `vanilla-rxjs/data/entity-cache.ts:111` "queueMicrotask(() => this.flush());"; Q2 `entity-cache.ts:121` "for (let i = 0; i < slots.length; i += MAX_BATCH)"; Q3 `entity-cache.ts:135` "byId.has(slot.id) ? fetched.ready(...) : fetched.error()"; Mechanism `entity-cache.ts:105-148`; endpoint `vanilla-rxjs/data/sources.ts:100` |
| ticketCounts | one call | split into chunks | only that id errors | helper (40) | none | Same lines as tiers; endpoint `vanilla-rxjs/data/sources.ts:101-105` |
| prices | one call | split into chunks | only that id errors | helper (40) | none | Same lines as tiers; endpoint `vanilla-rxjs/data/sources.ts:113` |

Notes:
- `batched` is not set for the three endpoints (`sources.ts:100`, `:101-105`, `:113`); `batched: false` is set for agent, product and stock (`sources.ts:98`, `:111`, `:118`).
- A request-level error fails the whole chunk (`entity-cache.ts:137`); an id missing from a successful answer fails only that id (`entity-cache.ts:135`).
- Test report: 0 failed of 102 (unit), 0 failed of 104 (E2E).

### 04 · Signal-store

| Endpoint | Q1 Ids asked in one tick | Q2 More than 20 ids | Q3 One id fails | Mechanism | Failing scenarios (report) | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| tiers | one call per id | cannot happen | only that id errors | none | A2, B10, C7, C11, C12, D7 | Q1 `ngrx-signal-store/data/sources.ts:118` "api.tiers([id])"; Q2 and Q3 same line (one id per call); Mechanism `sources.ts:116-132` |
| ticketCounts | one call per id | cannot happen | only that id errors | none | A2, B10, C7, C11, C12, D7 | Q1 `ngrx-signal-store/data/sources.ts:122` "api.ticketCounts([id])"; Q2 and Q3 same line; Mechanism `sources.ts:116-132` |
| prices | one call per id | cannot happen | only that id errors | none | A2, B10, C7, C11, C12, D7 | Q1 `ngrx-signal-store/data/sources.ts:131` "api.prices([sku])"; Q2 and Q3 same line; Mechanism `sources.ts:116-132` |

Notes:
- Each id is one entry of a `createKeyedCache` (`sources.ts:116-132`), so ids asked in one tick are not collected.
- No batching code exists in `ngrx-signal-store/data/` or `ngrx-signal-store/components/` (search for batch, chunk, MAX_BATCH and forkJoin finds none).
- Failing list is the same in unit (6 of 102) and E2E (6 of 104), `ngrx-signal-store/test_report.md`.

### 04 · Resources

| Endpoint | Q1 Ids asked in one tick | Q2 More than 20 ids | Q3 One id fails | Mechanism | Failing scenarios (report) | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| tiers | one call per id | cannot happen | only that id errors | none | A2, B10, C7, C11, C12, D7 | Q1 `resources/data/tiers.registry.ts:11` "api.tiers([params])"; Q2 and Q3 same line; Mechanism `tiers.registry.ts:7-12` |
| ticketCounts | one call per id | cannot happen | only that id errors | none | A2, B10, C7, C11, C12, D7 | Q1 `resources/data/ticket-counts.registry.ts:11` "api.ticketCounts([params])"; Q2 and Q3 same line; Mechanism `ticket-counts.registry.ts:7-12` |
| prices | other: one call per id (rows); the cart total asks its own list | other: cannot happen (rows); split into chunks (cart total) | other: only that id errors (rows); the whole batch errors (cart total) | helper (14), cart total only | A2, B10, C7, C11, C12, D7 | Rows: `resources/data/prices.registry.ts:11` "api.prices([params])"; cart total: Q2 `cart-prices.registry.ts:18` "const groups = chunk(params, MAX_BATCH);", Q3 `cart-prices.registry.ts:19` "forkJoin(groups.map((group) => api.prices(group)))"; Mechanism `cart-prices.registry.ts:6-21` |

Notes:
- Per-row reads are one `rxResource` per id (`tiers.registry.ts:27-33`, `ticket-counts.registry.ts:28-35`, `prices.registry.ts:27-33`).
- The cart total is one resource per sku list, with the skus split into groups of 20 and joined by `forkJoin` (`cart-prices.registry.ts:18-19`).
- The report also fails A7, B1, B3, C6, C9, C16, D9 and E7 (unit and E2E). They are not batching scenarios and are not listed above.

### 04 · Stateful-observable

| Endpoint | Q1 Ids asked in one tick | Q2 More than 20 ids | Q3 One id fails | Mechanism | Failing scenarios (report) | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| tiers | one call | split into chunks | only that id errors | configuration | none | Q1 `LIB/batcher.ts:163` "pendingFlush ??= timer(params.batchTime).subscribe(flush);"; Q2 `LIB/batcher.ts:145` "chunk(keys, maxBatchSize).forEach((chunkKeys) => {"; Q3 `LIB/batcher.ts:130` "request.subscriber.error(missingBatchItemError(request.id));"; Mechanism `sources/lookups.ts:86-97` |
| ticketCounts | one call | split into chunks | only that id errors | configuration | none | Same library lines; Mechanism `sources/lookups.ts:56-67` |
| prices | one call | split into chunks | only that id errors | configuration | none | Same library lines; Mechanism `sources/lookups.ts:197-207` |

Notes:
- Library: ids queued for `timer(batchTime)` and split by `maxBatchSize`; a loader error fails the whole chunk (`LIB/batcher.ts:125`), an id missing from the answer fails only that id (`:130`).
- Configuration per endpoint: `batchTime: BATCH_TIME_MS` with `BATCH_TIME_MS = 0` (`sources/lookups.ts:24`, `:61`, `:91`, `:202`) and `maxBatchSize: MAX_BATCH` (`sources/lookups.ts:62`, `:92`, `:203`).
- Test report: 0 failed of 102 (unit), 0 failed of 104 (E2E).

## Side by side

| Approach | Q1 Ids in one tick (tiers / ticketCounts / prices) | Q2 More than 20 ids | Q3 One id fails | Mechanism | Failing scenarios |
| --- | --- | --- | --- | --- | --- |
| Vanilla RxJS | one call / one call / one call | split into chunks (all three) | only that id errors (all three) | helper (40) (all three) | none |
| Signal-store | one call per id (all three) | cannot happen (all three) | only that id errors (all three) | none (all three) | A2, B10, C7, C11, C12, D7 |
| Resources | one call per id / one call per id / other: one call per id (rows), own list for cart total | cannot happen / cannot happen / other: cannot happen (rows), split into chunks (cart total) | only that id errors / only that id errors / other: only that id errors (rows), whole batch errors (cart total) | none / none / helper (14) (cart total only) | A2, B10, C7, C11, C12, D7 |
| Stateful-observable | one call (all three) | split into chunks (all three) | only that id errors (all three) | configuration (all three) | none |

## Verdict

- Vanilla RxJS does one call per tick for tiers, ticketCounts and prices, split into chunks of at most 20 (Side by side, Vanilla RxJS, Q1 and Q2); the code is helper (40) and no scenario fails (Vanilla RxJS, Failing scenarios column).
- Stateful-observable does the same three behaviours through configuration (Side by side, Stateful-observable, Mechanism): a shared `timer(batchTime)` window at `LIB/batcher.ts:163`, chunks at `LIB/batcher.ts:145`, and no scenario fails.
- Signal-store does one call per id for all three endpoints (Side by side, Signal-store, Q1), has no batching code (Mechanism), and fails A2, B10, C7, C11, C12 and D7 in unit and E2E.
- Resources does one call per id for tiers and ticketCounts and per row for prices, and one call per group of 20 for the cart total (Side by side, Resources, Q1 and Q2); it fails the same six scenarios as signal-store.
- Vanilla RxJS and Stateful-observable fail only the id missing from an answer, and Resources' cart total fails the whole batch when one group fails (Side by side, Q3).
