# Test oracle

## Idea
**Purpose:** the test oracle of the contest, not a contest entry and not a
model solution. It meets every requirement of stages 1–3
(docs/contest/stage-*.md), so the e2e and page suites can be checked against
something that passes, and it carries the defect switches (`?defect=`,
`PAGE_DEFECT`) that imitate each defect, which is why it holds a lot of code
an implementation would not. It is never given to implementers.

Plain RxJS over two small caches, all in `data/`:

- `query.ts`: keyed reads (one entry per key, shared by all observers,
  requested on the first observer, cancelled when nobody observes it, kept in
  cache, polled while observed) for whole responses (`orders`, `cart`, ...).
- `entity-cache.ts`: per-id caches for the batched services (`products`,
  `prices`, `stock`, `agents`, `tiers`, `ticketCounts`). Ids asked for in the
  same tick go out as one call of at most 20 ids; a loaded id is never
  requested again; a failed batch turns only its ids into `error` (`Fetched`, private to the data layer).
- `sources.ts`: every query and cache of the console, and what logout clears
  (products, prices, stock and product search are public and survive it).
- `mappers.ts` + `vm.ts` + `raw-models.ts`: DTO to view model mapping. Inside the
  data layer a row keeps the pieces of other services as `Fetched` next to it
  (so a failure can be told from "not yet"); at the edge of the store
  (`raw-models.ts`) a section is split into what the shared views take, its own
  data (`ownPage`, `ownCart`, ...), and one stream per service of the store
  (`productNames$`, `productPrices$`, `allCustomerNames$`, `tracking$`, ...)
  that the field components read; no view takes a lookup input.
  The `withParts` operator enriches a section's data once per new data value.
- `console.store.ts`: inputs, view models per section, retry, writes with
  their invalidations. `defects.ts`: the `?defect=` switches.
- `block-state.ts`: what a section's block gets from a section state
  (`loading`, `error`, `data`), shared by the section components.

## Component tree

The console is a shell (sign-in, or the frame with one section component per
region). A section owns its streams (`toSignal` over the store), its
`app-view-block` (`data-section`, loading, error, retry) and its shared
view; its field components live in subfolders; a field used by several parents
sits in a `fields/` folder of their lowest common ancestor. One folder per
component, `<name>/<name>.component.ts`.

```
oracle-console.component.ts             the shell (entry point); the field tokens are provided here
components/                               every component of the tree below
  agent/                                  S1
  notifications/                          S2
  customers/
    customer-list/                        S3
      customer-tier/
    customer-detail/
      header/                             S4
      tabs/                               the tab card
        orders-tab/  cart-tab/  tickets-tab/  notes-tab/     S5–S8
          (cart-tab) line-total/  cart-total/
      rail/
        shipments/                        S9
          shipment-tracking/
        activity/                         S10
      fields/kpi/                         header and the tab badge
    fields/open-tickets/                  list, header and the tab badge
  panels/
    order-panel/                          S11
      product-stock/  hit-add/
    ticket-panel/                         S12
  fields/                                 several unrelated parents
    product-name/  product-price/  customer-name/  agent-name/
data/                                     the data layer (logic, not components)
```

Never given to implementers; kept out of the contest bases.

## Try it
- Add `?defect=<name>` (comma-separated) to turn one behaviour off, e.g.
  `?defect=no-cache`, `?defect=no-partial`; `?defect=stage-1` and
  `?defect=stage-2` imitate a baseline-only and a robust-only page. The list
  is in `data/defects.ts`.
- Failures of enrichment sources (`tiers`, `products`, `agents`...) leave only their lookup entries missing (empty spaces) and the section works (`flag` in `data/vm.ts`); `?defect=no-partial` fails the whole section instead (its block shows the error).
- `?defect=stale-customer`: another customer's sections keep the previous customer's data on screen without saying they are loading (R-C2 allows old data only under a block's spinner).
- Notification sentences look customers up only while the bell is open (`openChange` of the shared view).
- Use the request panel above the demo: Manual latency, Throw switches.
