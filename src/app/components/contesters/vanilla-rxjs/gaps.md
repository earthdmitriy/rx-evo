# vanilla-rxjs: machinery built by hand (baseline)

Status (`test_report.md`, run 2026-11-19): nothing fails, 102 page tests and
104 e2e.

Rules: [docs/contest/gaps.md](../../../../../docs/contest/gaps.md). Vanilla's
tool is RxJS, so everything below is DIY, and every requirement is met. This
file is the baseline: the machinery a library would have to provide, and what
the other approaches' gaps are measured against. It takes a working knowledge
of RxJS lifetimes (refcounts, `finalize`, `defer`, microtask batching) to
write; the size is roughly that of a small library.

Line counts are non-blank, non-comment lines.

## Machinery

| # | Piece | Where | Lines | Does | Requirements it serves |
| --- | --- | --- | --- | --- | --- |
| M1 | Keyed query with cache | `data/query.ts` (`Entry`, `Query`) | 119 | One entry per key shared by every observer; request on first observer; cancel on last leave (marks stale); poll while observed (`pollMs`); keep data on error (`keepOnError`); `invalidate`, `refetch`, `retryIfFailed`, `set`, `clear` | R-L3, R-L5, R-L10, R-C4, R-D2, R-L8, R-G4, R-W3 |
| M2 | Per-id entity cache with batching | `data/entity-cache.ts` (`Slot`, `EntityCache`) | 136 | Ids asked in one tick collected (`queueMicrotask`), split into chunks of `MAX_BATCH`; per-id `error` when a batch fails or misses an id; a batch cancelled when none of its ids is observed; `invalidate`, `retryFailed`, `clear` | R-L9, R-J3, R-G5, R-C4, R-P3 |
| M3 | Enrichment operator | `data/vm.ts:43-83` (`withParts`) | ~35 | A section's rows enriched by other services once per new value; the new enrichment subscribed before the old is dropped, so shared ids are not cancelled in between | R-P1, R-P5, R-J3 |
| M4 | Keep previous on key switch | `data/vm.ts:22-33` (`keepPrevious`) | ~11 | The previous key's data shown dimmed while the next loads (customer list only) | R-C3 |
| M5 | Status → view mapping | `data/vm.ts` (`toVm`, `flag`, `failedCalls`, `errorCalls`, `statusFetched`), `fetched.ts`, `view-state.ts`, `block-state.ts` | ~60 | Query status to `loading`/`ready`/`error`/`empty`; failed enrichments as notices on a ready section; silent stale errors | R-E1, R-G2, R-G3, R-G4, R-G6 |
| M6 | Session reset | `data/sources.ts:122-141` (`clearSession`), `console.store.ts` (`logout`) | ~30 | Every user-bound cache cleared by hand; public catalog kept; UI state reset | R-S3, R-S4, R-L6 |
| M7 | Write guard | `console.store.ts:713-727` (`write`) and an `epoch` counter | ~15 | No double submit; an answer from a previous session dropped | R-W2, R-W5, R-W8 |
| M8 | Retry of what failed | `console.store.ts:602-683` | ~70 | Per section, which keys and ids to ask again | R-G5 |
| M9 | Write → readers | `console.store.ts:729-773` | ~40 | Each write names the keys it changes (`set`, `invalidate`) | R-W3, R-W10 |

Total generic machinery (M1–M7): about 400 lines. M8 and M9 are page logic
(they name entities), written in every approach in some form.

## What this sets as the comparison

- **M1 + M2** (keyed cache, refcount, cancel, batching): the core a data
  library is expected to give. An approach that has to rebuild them has a
  gap of the same kind and roughly the same size.
- **M3–M5**: status plumbing. The other approaches pay for it in their own
  shapes (blocks bound to a stream or a resource).
- **M6–M9**: session, writes, retry, refresh. Needed by every approach;
  compare only where a tool removes part of it (e.g. `active` on the session).
