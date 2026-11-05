# Chaos

## Warning
**This component does not care about changed inputs:** when `clientId` changes, the card keeps showing the first client.

## Idea
**Purpose:** a pure anti-pattern. No change handling, no progressive loading, a hidden race condition, no error handling.

Three promises are fired from `ngOnInit` and `ngOnChanges` and write into plain fields. Whichever promise finishes last (products) glues the fields together into `displayData` and flips `ready`. Nothing coordinates the requests.

## Good
- Easy to read for a newcomer: "call the API, assign the result".
- Every request is visible at the call site, no operators to learn.

## Bad
- Order is a race: if products arrive before client or bucket, `prepareData` gets `undefined` and throws inside the promise → the skeleton never goes away.
- `displayData` is built once, in the products callback. A new `clientId` only refetches `client` and `bucket` fields → the card keeps showing the first client.
- `ngOnChanges` runs before `ngOnInit`, so client and bucket are requested twice on start. Toggling **Show bucket** throws in `ngOnChanges` (`changes["clientId"]` is `undefined`).
- No error handling: a rejected promise is unhandled and `ready` stays `false`.

## Try it
- Press **Next client** or wait for **Autoincrement** — the client name and bucket do not change, but extra requests show up in the console.
- Toggle **Show bucket** and watch the console for a `TypeError` from `ngOnChanges`.
- Turn on **Throw** on the Products API (or **Bucket**) and reload the sample — the skeleton stays forever.
- Reload a few times: when the products request is the fastest, the skeleton also stays forever.

## Next step
[Multi-subscribe](/legacy/multisubscribe) — observables instead of promises, and the bucket → products dependency is made explicit (still by hand).
