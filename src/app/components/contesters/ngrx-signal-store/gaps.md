# ngrx-signal-store: gaps

Status (`test_report.md`, run 2026-11-19): 6 of 102 page tests and 6 of 104
e2e fail, the same six: A2, B10, C7, C11, C12, D7. All are G2 (batching).

Rules: [docs/contest/gaps.md](../../../../../docs/contest/gaps.md). Baseline:
[vanilla-rxjs/gaps.md](../vanilla-rxjs/gaps.md). Line counts are non-blank,
non-comment lines.

## Gaps

### G1 · No keyed async cache (rules 1 and 3)

`@ngrx/signals` holds state; it does not load it. The keyed read every section
needs (one entry per key, shared, requested on first consumer, cancelled when
the last one leaves, kept after) is hand-written on top of `withEntities`:

- `data/entity-store.ts:25-116` `createKeyedCache`: two `Map`s (observers per
  id, in-flight `Subject` per id), `attach`/`detach`/`reload`/`set`/`clear`,
  and a `peek` computed. With `cacheEntry`, `cacheEntryOptional`,
  `cacheEntries`, `singletonEntry`: 132 lines in the file. The same job as
  vanilla's M1 (`query.ts`, 119 lines).
- **Workaround (rule 1):** `cacheEntry` wraps `attach`/`detach` in
  `untracked()` (`entity-store.ts:127-143`). Without it, the cache's own
  signal reads become effect dependencies and a failed id is retried forever,
  which breaks the error scenarios. The `peek`/`attach` split exists for the
  same reason: `computed()` cannot write.
- **Per-entity cost:** `data/sources.ts` declares 21 caches, 4–5 lines each
  (one `createKeyedCache` per endpoint, about 100 lines), plus the
  `SESSION_CACHES` list cleared by hand on logout (`data/auth.ts`).

Scenarios it serves (all pass): B1, B8 (cancel), C1–C4, C6, C13, C14 (cache
and share), E7 (a failed reload keeps the value), A3, A4 (logout).

### G2 · No batching (rule 5: not met, would need rule-3 DIY)

Nothing collects the ids asked in one tick into one call. `tiers`,
`ticketCounts` and `prices` go out one id per call (`data/sources.ts`:
`api.tiers([id])`, `api.ticketCounts([id])`, `api.prices([sku])`). Meeting it
means adding vanilla's M2 (`entity-cache.ts`, 136 lines: per-tick buffer,
chunks of 20, per-id errors, cancel of a batch nobody waits for) into
`createKeyedCache`.

| Scenario | Stage | Fails because |
| --- | --- | --- |
| A2 | 3 | The list's 8 rows ask `tiers` and `ticketCounts` 8 times each; 1 each expected. |
| C11 | 3 | Same: 8 calls each for one list page. |
| C7 | 3 | Four hits make four `prices` calls; one batch expected. |
| B10 | 3 | Same cause: `prices` 4 where ≤ 1 is expected. |
| C12 | 3 | A 24-line cart makes 24 `prices` calls; 2 batches expected. |
| D7 | 3 | One release of the price batch shows only the first hit's price: each hit has its own request. |

## Implementation misses

None found.

## Shared (not a gap)

- **Polling:** `poll()` (`entity-store.ts:166-175`, 9 lines): interval +
  `reload` while the component lives. Every approach writes the same.
- **Writes:** `createAction` (`data/action.ts`, 18 lines): pending, error, no
  double submit. Vanilla's M7 and resources' `createAction` are the same.
- **Refresh after a write:** each write names the keys it reloads
  (`order-panel-section.component.ts:153-168`, `ticket-panel-section…:101-104`).
  Every approach does this.

## Not gaps

- **UI state** (`data/ui-state.ts`, 53 lines): `withState`/`withMethods` as
  designed; the debounced search is an `rxMethod`. Built in.
- **Per-field error blocks:** each field binds `fieldError(entry())` to its own
  `app-view-block` (one line per field). Simple.
