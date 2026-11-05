# Combine

## Idea
**Purpose:** decent for a one-shot component: one consistent result, cleaned up on destroy. But it is all-or-nothing.

`forkJoin` runs client, bucket and products requests in parallel and emits once, when all three are in. `displayData` is built from one consistent set of results. A `destroy$` subject with `takeUntil` ends the subscription with the component.

## Good
- One subscription, parallel requests, no half-filled state.
- `takeUntil(this.destroy$)` cancels in-flight requests on destroy (see the `unsubscribe` lines in the console).
- Still works with **Show bucket**, which is a plain input read by the template.

## Bad
- Everything lives in `ngOnInit`, so a new `clientId` is ignored → the card keeps showing the first client.
- No error handling: `forkJoin` fails as a whole and `ready` stays `false`, so the skeleton never goes away.
- State is mutable fields (`ready`, `displayData`), and the subscription is managed by hand.

## Try it
- Press **Next client** — nothing happens, the card is stale.
- Turn on any **Throw** switch in the Requests panel and reload the sample — one failed request kills the whole card and the skeleton stays.
- Toggle **Show bucket** while loading and after — the table appears and disappears immediately.

## Next step
[Input](/optimized/input) — reacts to `clientId` changes in `ngOnChanges` and reuses already loaded products.
