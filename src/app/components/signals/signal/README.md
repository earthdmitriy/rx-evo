# Signal

## Idea
**Purpose:** almost the same as [Stream](/pipe/stream), but the `async` pipes and the `ready` subjects are replaced by signals.

`input()` is turned into a stream with `toObservable`, loaded with `switchMap`, and exposed back as signals with `toSignal`. Two writable `signal`s (`clientReady`, `bucketReady`) are set from `tap` to drive the skeleton.

## Good
- `input.required()` replaces the setter and the `ReplaySubject`; `toSignal` unsubscribes on destroy.
- Reacts to `clientId`: `switchMap` cancels stale requests.
- The template reads plain signals, so no `async` pipe and no `OnPush` caveats.
- `products` is loaded once per component and not refetched per client.

## Bad
- Writable signals set from `tap` are the old `BehaviorSubject` flags again: state is duplicated and written from side effects.
- On every id change the skeleton replaces the old client and the bucket disappears, so stale data is thrown away.
- The streams are subscribed in the constructor, so the bucket and products are fetched even when **Show bucket** is off.
- An error ends the stream for good. The ready flag stays `false`, so the skeleton or empty space stays and no error is shown; the card does not recover after the toggle is turned off.
- `bucketReady` flips when the bucket arrives, not when products do: the table can show up empty first.

## Try it
- Turn on **Autoincrement**: each new client flashes the skeleton, and the bucket disappears while loading.
- Turn off **Show bucket**, then reload with **Next client**: the bucket request still runs (see the network log).
- Turn on **Throw** on the Client API and press **Next client**: the skeleton never goes away, even after turning the toggle off.
- Turn on **Throw** on the Bucket API: the bucket never appears and there is no message.

## Next step
[Container-Rx](/wip/container-rx) — a request wrapper that exposes data, loading and error together, so the flags are not written by hand.
