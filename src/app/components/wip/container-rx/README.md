# Container-Rx

## Idea
**Purpose:** the first draft of tooling. Progressive loading and error handling (display only, no retry) without bloating the component code.

`wrapMapRequest` turns `clientId$` into a container with `data$`, `loading$` and `error$`. The bucket and products containers are merged with `combineResponses`, and the template reads every field through the `async` pipe.

## Good
- Each block has its own loading, error and data streams, so the client card and the bucket load and fail independently.
- Old data stays on screen while the next client loads: `data$` is replayed, not cleared.
- No manual `subscribe`: the `async` pipe owns the subscriptions.

## Bad
- Retries are on by default (3 attempts, 1 s / 2 s / 3 s). Against an overloaded backend or a rate limit, automatic retries add load; retrying should be opted into per endpoint.
- Combining containers looks messy: `combineResponses` yields a tuple, and `combinedData$` needs its own `map` over `combined.data$` to build the bucket.
- No reload: the container has no `reload()`, so an error stays until `clientId` changes, and the old card is shown next to the error alert.
- `productsRequest` lives inside the component: every mount refetches the whole product catalog.
- `wrapMapRequest` is about 100 lines of `Subject` plumbing. A new id waits for the in-flight request instead of cancelling it.
- The input is bridged by hand: an `@Input` setter pushes into a `ReplaySubject`.

## Try it
- Turn **Autoincrement** off and click **Next client**: the client card keeps the old data (dimmed) and then swaps. The bucket stays dimmed all the time.
- Turn on **Throw** on the Client API: after about 6 s of retries an alert appears above the old card. There is no Retry. Turn the toggle off before the retries finish and the request recovers.
- Turn on **Throw** on the Products API: only the bucket block shows the error, the client card keeps working.

## Next step
[Container-Signal](/wip/container-signal) — the same wrapper with signals in the template.
