# resources: gaps

Status (`test_report.md`, run 2026-11-19): 14 of 102 page tests and 14 of
104 e2e fail, the same fourteen: A2, A7, B1, B3, B10, C6, C7, C9, C11, C12,
C16, D7, D9, E7. (G1 of the previous file passes now.)

Rules: [docs/contest/gaps.md](../../../../../docs/contest/gaps.md). Baseline:
[vanilla-rxjs/gaps.md](../vanilla-rxjs/gaps.md). Line counts are non-blank,
non-comment lines.

## Where the tool fits

`resource()` is designed as one async read owned by one reactive context (a
component or a service). Its signal params drive it, and it lives and dies
with its owner. That fits a baseline page well: one where the app, or an
isolated part of it, is simple and its sections share no data. Each section
owns its read, and loading, error, reload, cancel on param change and disposal
come with the owner, with no extra code.

It is not a cache, and is not meant to be one. It has no keys, no sharing
between consumers, no invalidation from outside, and nothing that notices
when nobody reads it. Angular leaves shared server state to a separate layer
(a query/cache library), which the contest rules out. So from stage 2 on, this
approach is measured on a job its tool was not built for. The gaps below are
"`resource()` alone does not fit a page with shared, cached data", not
"`resource()` is bad".

## Gaps

### G1 · No shared cache, no invalidation (rule 1: against the design; rule 3)

The page needs one request per key shared across sections, a cache that
outlives the view, and refresh from a write. The approach makes resources do
that by keeping them as singletons per key, outside the components that read
them:

- **Registries:** 12 `@Injectable` classes in `data/*.registry.ts`, one per
  entity, each a `Map` of `rxResource`s created with the registry's injector
  (23–33 lines each, 289 in all: per-entity, the same shape 12 times).
- **Session scope by injector:** the registries are provided by the signed-in
  frame (`resources-signed-in.component.ts`), so logout disposes them. This is
  how the user-bound caches are reset; there is no `clear()`.
- **Invalidation by version:** `data/bus.ts` (13 lines) keeps one counter per
  topic; a write bumps it and readers fold it into the registry key, so a write
  makes a new resource instead of refreshing the old one.
- **Consumers:** each reads its registry entry inside
  `computed(() => untracked(() => registry.x(id)))`, so creating the resource
  does not become a dependency.

Used this way, a resource outlives its readers and has no signal that they
left. Its effects also run outside any component. What broke, each recorded
by the implementer:

| Scenario | Stage | What happened |
| --- | --- | --- |
| B1 | 2 | A registry keeps the previous customer's resource alive, so its read is never cancelled (cancelled count 0). Cancelling needs reference counting on top of the registries (vanilla M1's `observers`). |
| C6 | 3 | An order registry (cache for a reopened order) was tried; it broke B8 (superseded order reads must be cancelled) for the same reason as B1, and was reverted. The order panel's resource stays component-owned: cancelled, not cached. |
| A7 | 3 | The catalog (products, prices, stock) must survive logout, so it cannot live in the signed-in frame. Root-scoped registries were tried; their resources' effects then ran inside the page harness's change detection (`ApplicationRef.tick is called recursively`, about 60 tests). Reverted; logout disposes the catalog (`prices` asked 2 times after re-login, 0 expected). Not re-run since. |

Cache and cancel exclude each other here. A component-owned resource is
cancelled with its owner but not kept; a registry resource is kept but never
cancelled. The version bus exists for the same reason: a resource cannot be
invalidated from outside, so a write changes the key instead. That costs B3
and C16 (see Implementation misses).

### G2 · No batching (rule 5: not met, would need rule-3 DIY)

Batching is cross-consumer by nature: ids from many readers go into one call.
A per-owner read cannot see the other readers, so this comes with G1's
mismatch. Nothing collects ids asked in one tick. `tiers.registry.ts`,
`ticket-counts.registry.ts` and `prices.registry.ts` call the batch endpoints
with one id. The cart total batches its own sku list
(`cart-prices.registry.ts`, 33 lines, chunks of 20 with `forkJoin`), but that
is one resource per sku list, separate from the per-sku prices the lines and
hits read. Meeting R-L9 means vanilla's M2 (136 lines) under the registries.

| Scenario | Stage | Fails because |
| --- | --- | --- |
| A2 | 3 | `tiers` and `ticketCounts` 8 calls each for the list; 1 each expected. |
| C11 | 3 | Same, for one list page. |
| C7 | 3 | Four hits make four `prices` calls; one batch expected. |
| B10 | 3 | Same cause: `prices` 4 where ≤ 1 is expected. |
| C12 | 3 | The cart's lines ask prices one by one next to the total's batch: 26 `prices` calls, 3 expected. |
| D7 | 3 | One release of the price batch shows only the first hit's price. |
| D9 | 3 | Likely the same split: the total waits on its own batched resource while the lines' prices are separate calls, so after one release the line prices and the total are not both shown. Not traced further. |

## Implementation misses

Concrete reasons to think these are small. **None was tried.**

- **B3** (stage 2, `tab-orders` is `loading`, `reloading` expected) and
  **C16** (stage 3, stock asked for 3 untouched skus). Both come from the
  version keys of G1: `Bus.orders`/`Bus.stock` are one counter for all keys,
  so a write creates new resources (empty, so `loading`) for every customer or
  sku. The registries already hold the entries, and
  `resource.reload()` keeps the value while it reloads (status `reloading`).
  The fix that seems needed: the write calls `registry.x(key).reload()` on the
  keys it changed, as the other approaches do, and the `Bus` goes.
- **E7** (stage 2, activity shows `error` after a failed poll, `ready`
  expected). A failed `reload()` puts the resource in `error`, and `value()`
  throws there, so the list goes. The fix that seems needed: keep the last
  value next to the resource (a `linkedSignal`, a few lines) and show the
  error only when there is none. The statefulObservable entry does the same in its template
  (shared, rule 2).
- **C9** (stage 3, `notifications` polled 1 time in 60 s, 2 expected). Not
  traced. The poll (`interval(30_000)` + `notifications.reload()` in the
  section's constructor) has the same shape as the other approaches'. Angular
  21.1's `reload()` returns `false` only while the status is `'loading'`
  (`_resource-chunk.mjs:230-236`), which a poll reload is not, so that does
  not explain it.

## Shared (not a gap)

- **Polling:** `interval` + `reload()` while the section lives (activity,
  notifications). Same in every approach.
- **Writes:** `data/action.ts` (18 lines), pending/error/no double submit.
- **Refresh after a write:** each write names what it changes (here through
  `Bus.bump`). Every approach does this.

## Not gaps

- **`hasValue()` before `value()`** in every view: one guard per read,
  because `value()` throws in `error`. Simple.
- **UI state** (`data/ui-state.ts`): plain signals. Built in.
