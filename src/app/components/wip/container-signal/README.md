# Container-Signal

## Idea
**Purpose:** an attempt to expose the containers as signals; a similar shape later became `resource` in Angular. The lesson: signals are synchronous and eager by nature, so lazy loading on top of them needs hacks and workarounds.

The same `wrapMapRequest` / `combineResponses` containers, converted with `.toSignal()`. `input()` feeds them through `toObservable`, and the bucket is a `computed()` over `combined.data()`.

## Good
- The template reads plain signals: no `async` pipe, no `@Input` setter.
- `computed()` replaces the extra `map` step for `prepareBucket`.
- Same stale-data-while-loading behaviour as the previous sample.

## Bad
- `toSignal()` subscribes eagerly in field initializers: bucket and products are fetched even when **Show bucket** is off.
- `filter(Boolean)` on `clientId` drops `0` (and `undefined`), so client 0 would never load. The demo counter starts at 1, so it is not visible here.
- Still no reload in the container: the error stays until `clientId` changes, next to the stale card.
- RxJS inside, signals outside: three `toSignal` calls with different initial values (`loading` true, `error` undefined, `data` null), and `computed` has to null-check.
- Products are still refetched by every component instance.

## Try it
- Turn **Show bucket** off, **Reset counters**, press **Next client**: the Bucket counter still moves.
- Turn on **Throw** on the Bucket API: after about 6 s of retries the bucket shows an alert without Retry. It recovers on the next client.
- Turn **Autoincrement** off and click **Next client**: the bucket is dimmed only during loading, unlike the previous sample.

## Next step
[Tiny-rx-store](/wip/tiny-rx-store) — the wrapper becomes a small store, and products move to a shared service.
