# 08 · Refresh after a write

Why: R-W3 (every shown result refreshes), R-W10 (exactly the affected keys
refresh, now if shown, otherwise marked outdated), R-L7 (a cached key is
refetched only when a write invalidates it). Requirement text:
`docs/contest/stage-1.md` (R-W3), `docs/contest/stage-2.md` (R-W10 table),
`docs/contest/stage-3.md` (R-L7).

Writes checked: the five of R-W10 (`updateOrder`, `replyTicket`, `addNote`,
`markNotificationsRead`, `resendConfirmation`). The two session writes in
`src/app/services/contesters/api` (`login`, `logout`) are answered in the notes
of each approach. Code paths are from the repo root under
`src/app/components/contesters/`, except the library, which is under
`src/app/submodules/stateful-observable/src/`.

Required keys (R-W10): `updateOrder` → `order(id)`, `orders(c)`,
`orderStats(c)`, `stock` of the order's skus before and after the change; with
a reply also `ticket(id)`, `tickets(c)`, `ticketsByOrder(order)`,
`ticketCounts(c)`. `replyTicket` → `ticket(id)`, `tickets(c)`,
`ticketCounts(c)`, `ticketsByOrder(order)` (the last when the thread has an
order). `addNote` → `notes(c)`. `markNotificationsRead` → `notifications`.
`resendConfirmation` → nothing.

---

## Failing scenarios (from the test reports)

Scenarios of this card: stage-1 `G1`, `G6`, `G8`, `G9` (R-W3 rows); stage-2
`G1`, `G6`, `G8`, `G9`, `G11` (R-W10 rows); stage-3 `C6` and `C16` (R-L7: a
cached order is not refetched; a write that changes stock marks it outdated).

Run 2026-11-19T08:58:44.143Z (all four reports, same run).

| Write | Scenarios | vanilla | ngrx-signal-store | resources | stateful-observable |
| --- | --- | --- | --- | --- | --- |
| updateOrder | G1, G11 | none | none | none (unit and e2e) | none |
| updateOrder (stock of touched skus) | C16 | none | none | C16 (unit and e2e) | none |
| replyTicket | G6 | none | none | none | none |
| addNote | G8 | none | none | none | none |
| markNotificationsRead | G9 | none | none | none | none |
| resendConfirmation | none checks it | none | none | none | none |
| R-L7 cached order reopened | C6 | none | none | C6 (unit and e2e) | none |

Sources: `src/app/components/contesters/<approach>/test_report.md`
(`vanilla-rxjs`, `ngrx-signal-store`, `resources`, `stateful-observable`).
Other failing scenarios in those reports (for example A2, B10, C7, C11, C12,
D7 for ngrx-signal-store; B1, B3, E7 for resources) are not in this card.

---

## Per approach

Columns: Q1 How readers learn · Q2 Keys refreshed (missing / extra) · Q3 Who
knows the list of readers · Q4 Adding one more reader of an affected key needs
a change in · Q5 Superseded versions.

### 08 · vanilla

| Write | Q1 | Q2 | Q3 | Q4 | Q5 | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| updateOrder | key invalidation (order set from the response, then keys invalidated) | `order(id)` set; `orders(c)`, `orderStats(c)`, `stock` of the skus before and after the change; with reply `ticket(id)`, `tickets(c)`, `ticketsByOrder(o)`, `ticketCounts(c)`. Missing: none. Extra: none. | the write (predicates over keys) | nothing else | dropped | `src/app/components/contesters/vanilla-rxjs/data/console.store.ts:729-749` "d.stock.invalidate((sku) => skus.has(sku));" |
| replyTicket | key invalidation (ticket set from the response) | `ticket(id)` set; `tickets(c)`, `ticketCounts(c)`, `ticketsByOrder(o)` when the thread has an order. Missing: none. Extra: none. | the write | nothing else | dropped | `console.store.ts:751-758` |
| addNote | key invalidation | `notes(c)`. Missing: none. Extra: none. | the write | nothing else | dropped | `console.store.ts:761-765` |
| markNotificationsRead | key invalidation (no predicate) | `notifications`. Missing: none. Extra: none. | the write | nothing else | dropped | `console.store.ts:767-769` |
| resendConfirmation | other: no refresh, the write names no key | nothing. | other: no keys named | nothing else | other: no key written | `console.store.ts:771-773` |

| Question | Answer | Evidence |
| --- | --- | --- |
| Mechanism | helper (7) | `src/app/components/contesters/vanilla-rxjs/data/query.ts:108-114` (`Query.invalidate`); the per-id `EntityCache.invalidate` is helper (8), `data/entity-cache.ts:66-74` |
| Failing scenarios (from report) | none | `vanilla-rxjs/test_report.md` (0 of 102 unit, 0 of 104 e2e) |

Notes:
- An invalidated key with no observer is only marked stale; it is requested on the next observer (`query.ts:108-114`, `entity-cache.ts:66-74`).
- `login` has no refresh (`console.store.ts:687-698`). `logout` clears the user-scope caches at once via `clearSession()` (`console.store.ts:700-711`, `data/sources.ts:122`).

### 08 · ngrx-signal-store

| Write | Q1 | Q2 | Q3 | Q4 | Q5 | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| updateOrder | explicit reload call (order set from the response, then reloads) | `order` set (`order-panel-section.component.ts:153`); `orders`, `orderStats`; `stock` reloaded for each touched sku, old and new lines; with reply `ticket`, `tickets`, `ticketCounts`, `ticketsByOrder`. Missing: none. Extra: none. | the write (names caches and ids) | nothing else | dropped | `src/app/components/contesters/ngrx-signal-store/components/panels/order-panel/order-panel-section.component.ts:149-169` |
| replyTicket | explicit reload call (thread set from the response) | `ticket` set (`ticket-panel-section.component.ts:101`); `tickets`, `ticketCounts`, `ticketsByOrder` when the thread has an order. Missing: none. Extra: none. | the write | nothing else | dropped | `ngrx-signal-store/components/panels/ticket-panel/ticket-panel-section.component.ts:99-105` |
| addNote | explicit reload call | `notes(c)`. Missing: none. Extra: none. | the write | nothing else | dropped | `ngrx-signal-store/components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:58` |
| markNotificationsRead | explicit reload call | `notifications`. Missing: none. Extra: none. | the write | nothing else | dropped | `ngrx-signal-store/components/notifications/notifications-section.component.ts:68` |
| resendConfirmation | other: no refresh, the action has no reload callback | nothing. | other: no keys named | nothing else | other: no key written | `ngrx-signal-store/components/panels/order-panel/order-panel-section.component.ts:138-140` |

| Question | Answer | Evidence |
| --- | --- | --- |
| Mechanism | helper (73) | `src/app/components/contesters/ngrx-signal-store/data/entity-store.ts:25-116` (`createKeyedCache`, whose `reload` is `entity-store.ts:89`) |
| Failing scenarios (from report) | none | `ngrx-signal-store/test_report.md` (fails A2, B10, C7, C11, C12, D7, none in this card) |

Notes:
- `reload` runs the loader for the key at once, observed or not (`entity-store.ts:89`). Keys of this write that no section shows are requested now, which R-W10 allows.
- `login` has no refresh (`data/auth.ts:15-18`). `logout` clears every cache in `SESSION_CACHES` (`data/auth.ts:21-26`, `data/sources.ts:139`).

### 08 · resources

| Write | Q1 | Q2 | Q3 | Q4 | Q5 | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| updateOrder | version bump in the key (order set locally on its own resource) | `order` set locally (`order-panel-section.component.ts:119`). Topic bumps `orders`, `orderStats`, `stock` (`:120`); with reply `tickets`, `ticketCounts`, `ticketsByOrder` (`:122-126`). Missing: `ticket(id)` (the thread is `threadRes` in `ticket-panel-section.component.ts:65`, bumped by no write here). Extra (every customer's and every sku's keys become new versions on next read): other customers' `orders`, `orderStats`, and with reply `tickets`, `ticketCounts`, `ticketsByOrder`; other skus' `stock`. | the readers (they fold `bus.x()` into their params) | nothing else (a new reader must fold the same `Bus` signal) | kept in the cache | `src/app/components/contesters/resources/components/panels/order-panel/order-panel-section.component.ts:115-128`; `resources/data/orders.registry.ts:32` `this.byKey.set(key, res);` |
| replyTicket | version bump in the key (thread set locally) | `ticket` set locally (`ticket-panel-section.component.ts:87`). Topic bumps `tickets`, `ticketCounts`, `ticketsByOrder` (`:88-92`), the last even when the thread has no order. Missing: none. Extra: other customers' `tickets`, `ticketCounts`; every order's `ticketsByOrder` on a bump. | the readers | nothing else | kept in the cache | `resources/components/panels/ticket-panel/ticket-panel-section.component.ts:85-93`; `resources/data/ticket-counts.registry.ts:33` |
| addNote | explicit reload call | `notes(c)` (own resource). Missing: none. Extra: none. | the write | nothing else | dropped | `resources/components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:48` |
| markNotificationsRead | explicit reload call | `notifications` (own resource). Missing: none. Extra: none. | the write | nothing else | dropped | `resources/components/notifications/notifications-section.component.ts:44` |
| resendConfirmation | other: no refresh, the action has no bump or reload | nothing. | other: no keys named | nothing else | other: no key written | `resources/components/panels/order-panel/order-panel-section.component.ts:111-112` |

| Question | Answer | Evidence |
| --- | --- | --- |
| Mechanism | helper (3) | `src/app/components/contesters/resources/data/bus.ts:20-22` (`Bus.bump`); the version-keyed registries are `orders.registry.ts:27-33`, `stock.registry.ts`, `ticket-counts.registry.ts` |
| Failing scenarios (from report) | C6, C16 (unit and e2e) | `resources/test_report.md` (14 unit and 14 e2e failures; C6 and C16 are the two in this card) |

Notes:
- A bump makes a new key `${id}:${version}` for the topic on its next read; the previous keys stay in `byKey` and are never removed (`orders.registry.ts:32`, `stock.registry.ts:32`, `ticket-counts.registry.ts:33`).
- `login` has no refresh. `logout` disposes the registries that the signed-in frame provides (`resources-signed-in.component.ts:47`).

### 08 · stateful-observable

| Write | Q1 | Q2 | Q3 | Q4 | Q5 | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| updateOrder | explicit reload call (entries reloaded in the write's `tap`) | `order` (own entry, `order-panel-section.component.ts:154`); `orders(c)` (`:155`); `orderStats(c)` (`:156`); `stock` of each sku before and after (`:158-160`); with reply `ticket(id)` (`:162`), `tickets(c)` (`:163`), `ticketCounts(c)` as `openTickets` (`:164`), `ticketsByOrder(o)` (`:165`). Missing: none. Extra: none. | the write (`.get(id).reload()`) | nothing else | dropped | `src/app/components/contesters/stateful-observable/components/panels/order-panel/order-panel-section.component.ts:152-169` |
| replyTicket | explicit reload call | `ticket(id)` (`ticket-panel-section.component.ts:80`); `tickets(c)` (`:81`); `ticketCounts(c)` as `openTickets` (`:82`); `ticketsByOrder(o)` when the thread has an order (`:83`). Missing: none. Extra: none. | the write | nothing else | dropped | `stateful-observable/components/panels/ticket-panel/ticket-panel-section.component.ts:78-84` |
| addNote | explicit reload call (the projected slot of the notes factory) | `notes(c)` (`notes-tab-section.component.ts:51`). Missing: none. Extra: none. | the write | nothing else | dropped | `stateful-observable/components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:46-56` |
| markNotificationsRead | explicit reload call | `notifications` (`notifications-section.component.ts:58`). Missing: none. Extra: none. | the write | nothing else | dropped | `stateful-observable/components/notifications/notifications-section.component.ts:55-58` |
| resendConfirmation | other: no refresh, the action has no reload | nothing. | other: no keys named | nothing else | other: no key written | `stateful-observable/components/panels/order-panel/order-panel-section.component.ts:171-173` |

| Question | Answer | Evidence |
| --- | --- | --- |
| Mechanism | built in | `src/app/submodules/stateful-observable/src/factory.ts:94` ("a kept value is dropped by `reload()`") |
| Failing scenarios (from report) | none | `stateful-observable/test_report.md` (0 of 102 unit, 0 of 104 e2e) |

Notes:
- `reload()` drops the kept value (`factory.ts:94`). Whether an unobserved entry with the default `refCount` is requested at once: not checked.
- `login` has no refresh. `logout`: user-bound sources take `active: inject(LOGGED_IN)` (`sources/lookups.ts:51`), and `LOGGED_IN` is defined at `sources/session.ts:61`.

---

## Side by side

| Approach | Q1 | Q2 missing | Q2 extra | Q3 | Q4 | Q5 | Failing (this card) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vanilla | key invalidation (updateOrder, replyTicket, addNote, markNotificationsRead) | none | none | the write | nothing else | dropped | none |
| ngrx-signal-store | explicit reload call (updateOrder, replyTicket, addNote, markNotificationsRead) | none | none (unshown keys requested now) | the write | nothing else | dropped | none |
| resources | version bump (updateOrder, replyTicket); explicit reload (addNote, markNotificationsRead) | `ticket(id)` on updateOrder with reply | other customers' and skus' keys on a bump; every order's `ticketsByOrder` on replyTicket | the readers | nothing else | kept in the cache | C6, C16 |
| stateful-observable | explicit reload call (all four) | none | none | the write | nothing else | dropped | none |

## Verdict

- Vanilla, ngrx-signal-store and stateful-observable name the same keys for the five writes; the write lists them (Q3 `the write`), and a new reader of an affected key needs no change (Q4 `nothing else`).
- Resources does not refresh `ticket(id)` after `updateOrder` with a reply, since its thread is a component-owned `rxResource` (resources, `updateOrder` row, Q2 Missing).
- Resources bumps topics, so every other customer's and every sku's keys become new versions (resources, `updateOrder` row, Q2 Extra); C16 fails for resources (Failing row, updateOrder).
- Resources is the only approach where the readers name themselves (Q3 `the readers`) and the only one that keeps every superseded version in its registry (Q5 `kept in the cache`); the other three replace the value (Q5 `dropped`).
- Of this card's scenarios, C6 and C16 fail for resources only; G1, G6, G8, G9 and G11 pass in all four approaches (Failing scenarios table).
