# stateful-observable: gaps

Status (`test_report.md`, run 2026-11-19): nothing fails, 102 page tests and
104 e2e.

Rules: [docs/contest/gaps.md](../../../../../docs/contest/gaps.md). Baseline:
[vanilla-rxjs/gaps.md](../vanilla-rxjs/gaps.md). Line counts are non-blank,
non-comment lines. Library: `src/app/submodules/stateful-observable/src`.

## Gaps

None found. The baseline's M1 and M2 (keyed cache, refcount, cancel, poll
target, batching) and M6 (session reset) are library options here:

| Baseline piece | Here | Where |
| --- | --- | --- |
| M1 keyed query, refcount, cancel, keep settled | `statefulObservableFactory` (`refCount`, `cacheSize`) | `sources/lookups.ts` |
| M2 batching, chunks of 20, per-id result | `statefulObservableBatchFactory` (`batchTime`, `maxBatchSize`, `idOf`) | `sources/lookups.ts` (tiers, ticket counts, prices) |
| M6 session reset | `active: inject(LOGGED_IN)` on every user-bound source | `sources/lookups.ts`, `sources/session.ts` |
| M7 write guard | `statefulObservable` with `exhaustMap` and `active` | `utils/action.ts` (19 lines) |

Per-entity cost: `sources/lookups.ts` declares 17 lookup tokens, one factory
call each with its options (165 lines in the file). That is configuration,
the same shape per entity.

## Implementation misses

None open. Fixed in this round: C16 (`updateOrder` now reloads the stock of
the skus before and after the change) and C15 (the activity poll reloads only
the shown customer's entry; a failed poll keeps the list, handled in the
template).

## Shared (not a gap)

- **Polling:** `timer` + `reload()` of the shown entry while the section lives
  (`activity-section.component.ts`). Same in every approach.
- **Refresh after a write:** each write names the keys it reloads; the order
  panel keeps the shown skus (`shownSkus`, 4 lines) to know the stock to
  reload. Every approach does this.
- **Keep the list on a failed poll** (R-G4) is decided in the template: an
  error shows only while there is no list of the shown customer. The same
  few lines resources would need for E7.
  - On a customer switch, `value$` keeps the last list under the spinner
    until the new one arrives. That is by design: the spinner marks it as not
    current (R-C2).
  - A block shows the error or the content, never both
    (`view-block.component.html`, `stateful-block.component.html`), so a
    failed load normally replaces the kept list.
  - The activity section overrides that: it passes no error while it has a
    list, to keep the list through a failed poll (R-G4). That override would
    also hide a failed first load of the next customer behind the previous
    one's list.
  - So the loader tags each list with its customer (`lookups.ts`,
    `ACTIVITY_BY_CUSTOMER`, one `map`), and the override applies only to the
    shown customer's list.
  - Views that bind the block's error as is need no tag.

## Not gaps, worth a look in the library

Simple DIY (rule 4), but each one is there because of how the library works:

- **Tab preference reset:** `LAST_TAB` resets itself on `LOGOUT_CLICKS`
  (`sources/session.ts`, 1 line): a signal is outside `active`.

## Note on the README

`README.md` "Bad" says each field reads `error$` in an empty `@if` to avoid
unhandled-error logs. No such line exists now: the fields use
`app-stateful-block` with `[stream]`, which handles the error. The README line
looks out of date.
