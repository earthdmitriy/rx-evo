# Cancelling a request nobody waits for

When the view moves to another key, the last consumer leaves, or the user logs
out, is the request still in flight cancelled, or does its answer just get
dropped?

Requirement: R-C4 (a superseded read is cancelled, not only ignored: a new key,
a closed panel, a logout) and §4.4 leaks. Scenarios: B1, A4, B8 (stage 2, under
R-C4) and A1, A6 (stage 3, under R-L1: signed out, no request). Scenario ids are
from `docs/contest/stage-2.md` and `stage-3.md`; those files do not tag
scenarios with requirement ids, so the mapping is by scenario text.

Paths below are relative to `src/app/components/contesters/` unless they start
with `src/` or `node_modules/`.

Q1 to Q3 give the rule for the path the scenarios exercise (a customer or an
order read as the user sees it). Where an approach has two rules, the answer is
`other:`, and Q4 names the sources that follow the second one.

## Per approach

### 03 · Vanilla RxJS

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 New key for the same view | cancelled | `vanilla-rxjs/data/console.store.ts:238` "switchMap((id) => (id === null ? of(IDLE_VM as Vm<T>) : project(id)))," (the old `observe` is unsubscribed, `query.ts:103` finalize → `detach`, `query.ts:66-76`) |
| Q2 Last consumer leaves while in flight | cancelled | `vanilla-rxjs/data/query.ts:70-72` "if (this.state$.value.fetching) {" then `this.inflight?.unsubscribe();` |
| Q3 Logout while in flight | cancelled | `vanilla-rxjs/data/console.store.ts:703` "this.signedIn$.next(false);" (the signed-in gate at `console.store.ts:152` unsubscribes the project), and `console.store.ts:709` `this.d.clearSession();` |
| Q4 Which sources are exceptions | none | `vanilla-rxjs/data/sources.ts:140` (products, prices, stock are kept across sessions, but they are still released by observer count when the gate at `console.store.ts:152` closes) |
| Mechanism | helper (24) | `vanilla-rxjs/data/query.ts:66-76` (10) + `vanilla-rxjs/data/entity-cache.ts:161-175` (14) |
| Failing scenarios (from report) | none | `vanilla-rxjs/test_report.md` (unit 0 of 102, E2E 0 of 104) |

Notes:
- Cancellation runs from the observer count: each observer's `finalize` calls `detach` (`query.ts:103`, `entity-cache.ts:52`).
- A batched id is not cancelled while another id in the same batch is still observed (`entity-cache.ts:167-168`).
- Logout also disposes every keyed query and entity cache of the session (`query.ts:137-140`, `sources.ts:122-139`).

### 03 · Signal-store

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 New key for the same view | cancelled | `ngrx-signal-store/data/entity-store.ts:137` "onCleanup(() => untracked(() => cache.detach(current)));" |
| Q2 Last consumer leaves while in flight | cancelled | `ngrx-signal-store/data/entity-store.ts:81` "const stop = inFlight.get(id);" then `stop.next();` at `:83` |
| Q3 Logout while in flight | cancelled | `ngrx-signal-store/data/auth.ts:25` `this.caches.forEach((cache) => cache.clear());` and `entity-store.ts:97` "inFlight.forEach((stop) => stop.next());" |
| Q4 Which sources are exceptions | none | `ngrx-signal-store/data/sources.ts:106` and `:138` (public caches are not in `SESSION_CACHES`, but every read follows the same detach rule) |
| Mechanism | helper (14) | `ngrx-signal-store/data/entity-store.ts:74-87` (`takeUntil(stop)` at `entity-store.ts:46`) |
| Failing scenarios (from report) | none | `ngrx-signal-store/test_report.md` (unit and E2E fail A2, B10, C7, C11, C12, D7; none is in this list) |

Notes:
- Cancellation is `takeUntil(stop)` on a per-id `Subject`, fired by the last `detach` (`entity-store.ts:46`, `:83`).
- `reload` (Retry, poll tick) starts a read outside the observer count (`entity-store.ts:89`); the next `detach` of that id cancels it.
- Logout cancels every read in flight, then clears the session caches (`entity-store.ts:96-100`, `auth.ts:25`).

### 03 · Resources

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 New key for the same view | other: ignored for registry reads; cancelled for component-owned `rxResource` on params change | `resources/components/customers/customer-detail/header/customer-header-section.component.ts:42` "return untracked(() => this.registry.customer(id));" and `resources/data/customers.registry.ts:29` (the old resource stays in `byId`, `:23`); component-owned: `node_modules/@angular/core/fesm2022/_resource-chunk.mjs:272` |
| Q2 Last consumer leaves while in flight | other: runs to the end for registry reads; cancelled on destroy for component-owned `rxResource` | `resources/data/customers.registry.ts:23` "private readonly byId = new Map<number, ReturnType<typeof makeCustomerResource>>();" (no observer count); component-owned: `_resource-chunk.mjs:250` |
| Q3 Logout while in flight | cancelled | `resources/resources-console.component.ts:45` "@if (!ui.signedIn()) {" destroys the frame that provides the 12 registries (`resources/resources-signed-in.component.ts:47-59`); the registries' resources abort on destroy: `_resource-chunk.mjs:201` and `:250` |
| Q4 Which sources are exceptions | 12 registries: activity, cart, cart-prices, customer-list, customers, order-stats, orders, prices, products, stock, ticket-counts, tiers | `resources/data/*.registry.ts` (one `rxResource` per key in a `Map`, nothing aborts it when a consumer leaves) |
| Mechanism | built in (component-owned); none (registries) | component-owned: `node_modules/@angular/core/fesm2022/_resource-chunk.mjs:272` and `node_modules/@angular/core/fesm2022/rxjs-interop.mjs:219-220`; registries: no cancel code, `resources/data/customers.registry.ts:19-34` |
| Failing scenarios (from report) | B1 | `resources/test_report.md` (unit and E2E; the other failing ids A7, B3, C6, C7, C9, C11, C12, C16, D7, D9, E7, A2, B10 are outside this list) |

Notes:
- Component-owned `rxResource`s (e.g. `resources/components/panels/order-panel/order-panel-section.component.ts:65`) abort when `params` change (`_resource-chunk.mjs:272`) and on destroy (`_resource-chunk.mjs:250`).
- Registry reads keep their key for the session, so their `params` never change, and nothing aborts them when a consumer leaves (`customers.registry.ts:9`, `:23-33`).
- `resources/gaps.md` G1 records the B1 failure and the same cause.

### 03 · stateful-observable

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 New key for the same view | other: cancelled for `refCount: true` sources (default); `refCount: false` sources stay connected after the key changes | `src/app/submodules/stateful-observable/src/factory.ts:298` "switcher: params.mapOperator ?? switchMap," (default; `stateful-observable/sources/lookups.ts:47-53` `CUSTOMER_BY_ID` sets no `refCount`); `factory.ts:234-238` for `refCount: false` |
| Q2 Last consumer leaves while in flight | other: cancelled for `refCount: true` (default); runs to the end for `refCount: false` | `src/app/submodules/stateful-observable/src/factory.ts:143` "const refCount = params.refCount ?? true;"; the rule is in the doc at `factory.ts:86-92` |
| Q3 Logout while in flight | other: cancelled for `refCount: true` (the views unmount); `refCount: false` loads run to the end and their result is dropped | `stateful-observable/console-page.component.ts:79` "@if (loggedIn()) {"; dropped result: `src/app/submodules/stateful-observable/src/keepSettled.ts:15-16` (forget), `:49` "if (last && startedAt === generation) {" |
| Q4 Which sources are exceptions | 6 `refCount: false` lookups: `openTicketsByCustomer` (ticket counts), `tierByCustomer`, `agentName`, `productName`, `currentPrice`, `stockBySku` | `stateful-observable/sources/lookups.ts:64`, `:94`, `:179`, `:191`, `:204`, `:213` (`refCount: false`) |
| Mechanism | built in | `src/app/submodules/stateful-observable/src/factory.ts:143` (default `refCount: true`); `refCount: false` is configuration (`lookups.ts:64`) |
| Failing scenarios (from report) | none | `stateful-observable/test_report.md` (unit 0 of 102, E2E 0 of 104) |

Notes:
- `refCount: false` entries stay connected until they leave the cache (`factory.ts:234-238`), so their in-flight read is not cancelled by the last consumer leaving.
- The session writes (`stateful-observable/sources/session.ts:37`, `:51`) and `utils/action.ts:26` also set `refCount: false`; they are writes, so they are left out of Q4.
- `active: false` on logout drops kept values (`factory.ts:163-170`); it does not end the `refCount: false` connection.

## Side by side

| Approach | Q1 New key | Q2 Last consumer leaves | Q3 Logout | Q4 Exceptions | Mechanism | Failing scenarios |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla RxJS | cancelled | cancelled | cancelled | none | helper (24) | none |
| Signal-store | cancelled | cancelled | cancelled | none | helper (14) | none |
| Resources | other: ignored (registries); cancelled (component-owned) | other: runs to the end (registries); cancelled on destroy (component-owned) | cancelled | 12 registries | built in (component-owned); none (registries) | B1 |
| stateful-observable | other: cancelled (`refCount: true`); not cancelled (`refCount: false`) | other: cancelled (`refCount: true`); runs to the end (`refCount: false`) | other: cancelled (`refCount: true`); runs to the end, result dropped (`refCount: false`) | 6 `refCount: false` lookups | built in | none |

## Verdict

- Vanilla RxJS cancels a superseded key, a last consumer leaving and logout through the observer count, with no exceptions (Side by side, Vanilla row, Q1-Q4). None of B1, A4, B8, A1 or A6 fails in its report.
- Signal-store does the same with `takeUntil` on a per-id subject (Side by side, Signal-store row, Q1-Q4 and Mechanism). None of B1, A4, B8, A1 or A6 fails; A2, B10, C7, C11, C12 and D7 fail, outside this list.
- Resources ignores a superseded customer read and lets the reads of its 12 registries run to the end when their last consumer leaves (Side by side, Resources row, Q1, Q2, Q4). B1 fails in both of its reports.
- Resources cancels component-owned `rxResource`s on params change and on destroy, and it aborts every registry read when logout destroys the signed-in frame (Per approach, Resources, Q3 and Mechanism).
- stateful-observable cancels by default (`refCount: true`) and keeps six `refCount: false` lookups connected, so their in-flight reads run to the end (Side by side, stateful-observable row, Q2 and Q4). None of the scenarios in this list fails in its report.
