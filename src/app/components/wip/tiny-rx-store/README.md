# Tiny-rx-store

## Idea
**Purpose:** lessons learned from the containers: an improved combine, and `reload()` handled.

`createTinyRxStore({ input, loader, processError })` packs the request wrapper into one config object that returns `data`, `loading`, `error` and `reload()`. Products live in a root `ProductsStoreService` and are combined with the bucket by `combineTinyRxStores`.

## Good
- Products are fetched once for the whole app and reused by every component instance.
- Errors are mapped by `processError`; the combined bucket store reports an error per source, so the alert says which request failed.
- Every block can retry: `combineTinyRxStores` forwards `reload()` to every source, including the shared products store.
- Stores are lazy and cancel outdated requests (`switchMap`). A hidden bucket is not fetched.
- No component-level infrastructure: the component only declares stores.
- No automatic retries by default (`attempts: 0`): retrying is opt-in per endpoint, not a store-wide default.

## Bad
- `error` ignores loading events, so the old alert stays (dimmed) while Retry is loading.

## Try it
- Turn on **Throw** on the Client API: the alert with **Retry** appears at once. Turn the toggle off and press Retry: the card returns.
- Turn on **Throw** on the Products API: the bucket shows "Can't load products". Switching clients does not fix it (products are loaded once), but turning the toggle off and pressing **Retry** does.
- Turn on **Throw** on the Bucket API: "Can't load bucket" with **Retry**; the next client also loads normally.

## Next step
[Tiny-store](/wip/tiny-store) — the same store idea with a signal API.
