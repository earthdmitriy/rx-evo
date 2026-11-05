# Multi-subscribe

## Warning
**This component does not care about changed inputs:** `clientId` is read once in `ngOnInit`, later values are ignored.

## Idea
**Purpose:** the race condition of Chaos is mitigated by starting one `subscribe()` from inside another, so products are only processed after the bucket has arrived.

Observables replace promises, but they are chained by hand: `subscribe()` on the bucket calls another `subscribe()` for products. Results are stored in fields and `displayData` is built in the innermost callback, once.

## Good
- The race of Chaos is mitigated: products are subscribed from inside the bucket callback, so `prepareData` never sees an undefined bucket.
- Every request is cancellable in principle, because it is an observable.

## Bad
- Subscriptions are never stored or unsubscribed → callbacks run (and write fields) after the component is destroyed.
- Client is a separate, unsynchronised subscription: if it arrives after products, `displayData` is built with `client === undefined` and is never rebuilt.
- Bucket and products are a waterfall (bucket time + products time) instead of running in parallel.
- No `ngOnChanges`: a new `clientId` is ignored, the card shows the first client forever.
- No error callbacks: any error is unhandled and the skeleton stays.

## Try it
- Press **Next client** — nothing is refetched, the card does not change.
- Reload the sample a few times: sometimes the client block is empty because the client response came last.
- Turn on **Throw** on the Bucket API or **Products** and reload — the skeleton never goes away.
- Compare time to first render with Combine: the two dependent requests run one after another.

## Next step
[Combine](/optimized/combine) — `forkJoin` loads everything in parallel into one consistent result, with `takeUntil` cleanup.
