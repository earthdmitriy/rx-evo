# Input

## Idea
**Purpose:** the first sample with change handling. Still all-or-nothing, still no error handling.

Like Combine, but `ngOnChanges` reloads client and bucket whenever `clientId` changes, reusing the products saved from the first load. The loading code is written twice, once in `ngOnInit` and once in `ngOnChanges`.

## Good
- The card follows **Next client** and **Autoincrement**.
- Products are fetched once; later reloads only request client and bucket.
- The skeleton is shown again while a new client loads.

## Bad
- No `switchMap`: every change starts its own `forkJoin`, and an older slower request can finish last and overwrite the newer client.
- Loading logic is duplicated; if `clientId` changes before the first products response, `this.products` is `undefined` and `prepareData` throws.
- No error handling: a failed request leaves `ready = false` and the skeleton stays.
- Stale data is hidden (skeleton replaces the card) instead of dimmed, and state is mutable fields.

## Try it
- Press **Next client** several times quickly — watch the card show a client that is not the one in the header badge.
- Turn on **Throw** on the Client API and press **Next client** — the skeleton stays.
- Turn on **Throw** on the Products API after the first load — no effect, products are cached.
- Toggle **Show bucket** — works.

## Next step
[Almost there](/pipe/almost-there) — `defer` + `combineLatest` with the `async` pipe removes manual subscriptions.
