# Stateful-observable

## Idea
**Purpose:** the final solution. History and design decisions: [ADR](https://github.com/earthdmitriy/stateful-observable/blob/main/docs/adr.md).

Client and bucket each get their own root: `statefulObservable(clientId$)` turns the input into a stream of loading, value and error states. `pipeValue` maps only successes, `pipeError` only failures, and `combineStatefulObservables` merges bucket and products. `app-stateful-block` renders loading, error with Retry, or the projected content. Products come from the root `allProductsToken`.

## Good
- One primitive for every block; the template is just a block plus its content.
- Blocks are independent, and old data stays (dimmed) while a new id loads, so there is no layout jump.
- Errors keep their meaning: the block shows the message mapped by `pipeError` ("Can't load bucket", "Can't load products").
- Every block has a working Retry, and it refetches only what failed: `reload({ onlyFailed: true })` skips healthy sources of the combine, and separate roots keep the client out of a bucket retry.
- Products are fetched once and shared through the token (`shareReplay(1)`); a hidden bucket is not fetched.
- The component holds only pure mappings: no `subscribe`, no mutable state, and `switchMap` cancels outdated requests.

## Bad
- It is a separate library to learn and maintain.

## Try it
- Turn on **Throw** on the Bucket API: only the bucket block shows the alert with **Retry**; the client card keeps updating. Turn the toggle off, **Reset counters** and press **Retry**: only the Bucket counter moves.
- Products load once per app, so to see them fail: open another sample first (e.g. [Combine](/optimized/combine)), turn on **Throw** on the Products API, then come back here. The bucket block shows "Can't load products"; turn the toggle off, **Reset counters**, press **Retry**: only Products moves.
- With products loaded, **Throw** on the Products API changes nothing: the shared catalog is not requested again.
- Turn **Autoincrement** off and click **Next client**: the old card stays dimmed until the new one arrives.

## Next step
The list samples at [Pagination](/x/pagination) apply the same primitive to harder screens.
