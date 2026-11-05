# Almost there

## Idea
**Purpose:** change handling is removed on purpose, to keep the sample simple. It illustrates that a component can work on `async` pipes alone, without explicit subscriptions.

Streams are declared in place with `defer` and joined with `combineLatest`; the template subscribes once through `| async`. No `ngOnInit`, no manual subscriptions, no `takeUntil`. But `defer` reads `clientId` only at subscribe time, so the pipeline is built once.

## Good
- No lifecycle hooks and no `destroy$`: the `async` pipe subscribes and unsubscribes.
- `defer` lets the stream use `this.clientId` without `ngOnInit`.
- One `| async` subscription, so each request runs once; the three requests run in parallel.
- No manual `products` cache and no duplicated `forkJoin` in `ngOnChanges`.

## Bad
- Change handling is left out on purpose: `defer` captures `clientId` once at subscribe time, so the card never updates when `clientId` changes. [Stream](/pipe/stream) brings it back.
- Any error ends `combineLatest` and the `async` pipe rethrows it. `ready` is set only in `tap`, so the skeleton stays forever and no error is shown.
- After a failure there is no way back: the stream is dead, so turning the error toggle off does nothing.
- `ready = true` is a plain field mutated from `tap`. It works with `OnPush` only because the `async` pipe marks the view dirty.
- Everything appears together after the slowest of the three requests (up to 5 s).

## Try it
- Press **Next client** or turn on **Autoincrement**: the card stays on the first client.
- Turn on **Throw** on the Client API (or Bucket / Products) before the first load: the skeleton never goes away. Turn it off and nothing changes.
- Toggle **Show bucket**: it only hides and shows the table, because the data is already loaded.

## Next step
[Stream](/pipe/stream) — a `ReplaySubject` fed by the input setter and `switchMap` make the card react to `clientId`.
