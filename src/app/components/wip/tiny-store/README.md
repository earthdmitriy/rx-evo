# Tiny-store

## Idea
**Purpose:** Tiny-rx-store with signals as the external API. Declined, because it is eager.

`createTinyStore({ input, loader })` takes an `input()` signal and returns `data()`, `loading()` and `error()` signals. `combineTinyStores` builds the bucket with `computed()`; RxJS stays inside the store.

## Good
- The template and the component use only signals: no `async`, no `toObservable` in the component.
- Old data stays while the next client loads.
- The component is short: three stores and one combine.

## Bad
- Retries are back on by default (3 attempts), unlike Tiny-rx-store: retrying should be opted into per endpoint.
- Eager after the first read: `toLazySignal` subscribes on the first read and never lets go. Show the bucket, hide it, press **Next client**: the bucket is still requested although the section is not visible.
- `error()` is a boolean: the error value is lost and there is no `processError`, so the view cannot tell a products failure from a bucket failure.
- No `reload()`, so no Retry button anywhere. An error stays until `clientId` changes.
- Products are created per component instance and refetched on every mount; the shared service from the previous sample is gone.
- `combineTinyStores` returns `null` data if any source fails, so the bucket disappears under the alert.
- `filter(Boolean)` on the input drops `0`; `toLazySignal` comes from `ngxtension`.

## Try it
- Turn on **Throw** on the Products API: after about 6 s of retries the bucket block shows "Failed to load bucket" and no table.
- Turn on **Throw** on the Client API: the alert appears above the old client card, with no Retry.
- With the bucket visible, turn **Show bucket** off, **Reset counters**, press **Next client**: the Bucket counter still moves.

## Next step
[Resource](/wip/resource) — the platform's own `rxResource` instead of a custom store.
