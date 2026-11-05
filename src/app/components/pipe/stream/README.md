# Stream

## Idea
**Purpose:** the best solution without extra libraries in the pre-signal era. It has progressive loading. It lacks error handling on purpose: without extra tooling, error handling would bloat the code.

The `clientId` input setter pushes into a `ReplaySubject`. Client and bucket are loaded per id with `switchMap`; products are loaded once. Loading state lives in `BehaviorSubject` flags driven by `tap`.

## Good
- The card reacts to `clientId`: `switchMap` cancels the previous request, so a slow old response cannot overwrite a newer one.
- The flag is set before `switchMap`, so a cancelled request does not leave `loading` stuck.
- Stale data stays on screen with `.loading` while the next one loads.
- `products` is loaded once per component and kept by `shareReplay(1)`, not refetched per client.

## Bad
- Loading is hand-written: three `BehaviorSubject`s plus `tap` pairs. Easy to forget one; the products flag never goes back to `true`.
- No error state — a deliberate trade-off: hand-written error handling would double the code. An error ends the stream, the `async` pipe rethrows, and the flag stays `true`: the block dims forever.
- Client has no way back: the stream is dead, so **Next client** and turning the toggle off change nothing.
- The `ReplaySubject` keeps every id ever pushed, so memory grows and a late subscriber replays them all.

## Try it
- Turn on **Autoincrement** and watch the cards dim and refresh on each new client; **Next client** works too.
- Turn on **Throw** on the Client API, then press **Next client**: the client card dims and never recovers, even after turning the toggle off.
- Turn on **Throw** on the Bucket API, turn it off, then toggle **Show bucket** off and on: only this re-subscription brings the bucket back.
- Turn on **Throw** on the Products API before the first load: the bucket stays dimmed.

## Next step
[Signal](/signals/signal) — the same pipeline with `input()`, `toObservable` and `toSignal`, and no `ReplaySubject`.
