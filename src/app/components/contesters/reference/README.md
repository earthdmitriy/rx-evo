# Reference

## Idea
**Purpose:** the test oracle of the contest, not a contest entry. It meets
every requirement of stages 1–3 (docs/contest/stage-*.md), so the e2e suite
can be checked against something that passes.

Plain RxJS over two small caches, all in `data/`:

- `query.ts`: keyed reads (one entry per key, shared by all observers,
  requested on the first observer, cancelled when nobody observes it, kept in
  cache, polled while observed) for whole responses (`orders`, `cart`, ...).
- `entity-cache.ts`: per-id caches for the batched services (`products`,
  `prices`, `stock`, `agents`, `tiers`, `ticketCounts`). Ids asked for in the
  same tick go out as one call of at most 20 ids; a loaded id is never
  requested again; a failed batch turns only its ids into `error` parts.
- `sources.ts`: every query and cache of the console, and what logout clears
  (products, prices, stock and product search are public and survive it).
- `mappers.ts` + `vm.ts`: DTO to view model mapping (`Part`s for fields of
  other services, sentences for notifications and activity) and the
  `withParts` operator that enriches a section's data once per new data value.
- `console.store.ts`: inputs, view models per section, retry, writes with
  their invalidations. `defects.ts`: the `?defect=` switches.

Never given to implementers; kept out of the contest bases.

## Try it
- Add `?defect=<name>` (comma-separated) to turn one behaviour off, e.g.
  `?defect=no-cache`, `?defect=no-partial`; `?defect=stage-1` and
  `?defect=stage-2` imitate a baseline-only and a robust-only page. The list
  is in `data/defects.ts`.
- Failures of enrichment sources (`tiers`, `products`, `agents`...) turn only their `Part`s into `error` and flag the section `stale-error` with Retry (`flag` in `data/vm.ts`); `?defect=no-partial` fails the whole section instead.
- Notification sentences look customers up only while the bell is open (`openChange` of the shared view).
- Use the request panel above the demo: Manual latency, Throw switches.
