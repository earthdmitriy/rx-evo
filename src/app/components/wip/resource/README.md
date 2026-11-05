# Resource

## Idea
**Purpose:** a later addition with Angular `rxResource`. It is eager, like [Tiny-store](/wip/tiny-store). Angular has no built-in way to combine several resources, so the sample ships its own `combineResources`. Retry is available. Unlike Tiny-store, a new request resets `value()` to `undefined`: the content is wiped and the layout shifts — one more reason to go on with an own solution.

Each request is an Angular `rxResource` with `params` bound to the `input()` signal. A custom `combineResources` helper derives the bucket from the bucket and products resources.

## Good
- Single requests need no custom infrastructure: `value`, `isLoading`, `error` and `reload()` are platform API.
- `params` makes the request declarative, and an outdated request is cancelled when the id changes.
- Every block can retry: `reload()` on the client resource, and `combineResources` forwards `reload()` to all its sources. `reload()` keeps the previous value while reloading.
- Short component, signals only in the template.

## Bad
- A new `clientId` resets `value()` to `undefined`: the client card and the bucket are wiped while loading, and the page below jumps (layout shift). The previous samples kept stale data.
- Angular has no way to combine resources, so `combineResources` is hand-written. Which status should win when the sources disagree (e.g. one loading, one failed) is an open question, marked TODO.
- All resources start immediately (even with **Show bucket** off), and products are refetched per component instance.

## Try it
- Turn **Autoincrement** off and click **Next client**: both blocks go empty (with the spinner) and the content below jumps up, then back down when the new data appears. Compare with [Tiny-store](/wip/tiny-store), which keeps the old card.
- Turn on **Throw** on the Client API: the client block shows an alert with **Retry**. Turn the toggle off and press **Retry**. The same works for the Bucket and Products APIs in the bucket block.
- Turn **Show bucket** off, **Reset counters**, press **Next client**: the Bucket counter still moves.

## Next step
[Stateful-observable](/wip/stateful-observable) — stale data, Retry on every block and shared products from one primitive.
