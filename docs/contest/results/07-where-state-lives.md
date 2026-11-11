# Where state lives

Which holders keep state in the data layer and in the section components, what
each one holds, how long it lives, and what resets it at logout. Methodology
§4.1 "State spread": every holder is something to reset at logout and to keep
consistent.

Scope: the data layer and section components of each approach (table in
`criteria.md`). Paths are relative to `src/app/components/contesters/<approach>/`,
except `src/app/submodules/...` (library source), which is cited only where a
reset depends on it. The card has no scenario list, so no `test_report.md` or
`gaps.md` is used.

Holders are the keywords of criterion 07. Rules applied to all four:
- Q1 counts declared holders. The vanilla `onTab` helper (`console.store.ts:320-327`)
  creates one replay per call, so its three calls count three.
- Not holders: local `new Map` values inside a projection (vanilla
  `console.store.ts:167`, `248`, `334-335`, `382`, `398`, `519-520`; resources
  `cart-total.component.ts:34`); the `out.next` inside vanilla `vm.ts` operators
  (not a field writer); vanilla `toSignal(...)` copies in components (not a
  criterion 07 keyword; each mirrors a replay above).
- stateful-observable's `statefulObservable(...)` nodes in components are holders: each keeps
  its own cached value, as a resources `rxResource` does.
- Q2 counts files that read the signed-in flag or the selected customer from the
  holder itself: a signal read, a subscription, `@if`, or `active:` on
  `LOGGED_IN`. A file that gets the value through an `input`, or from a view
  model derived from it, is not counted.
- Q3 counts call sites of `next`, `set`, `update`, `patchState` outside source
  definitions (vanilla `data/sources.ts`; stateful-observable `sources/session.ts`) and
  outside the mechanism files that implement a holder (vanilla `data/query.ts`,
  `data/entity-cache.ts`; signal-store `data/entity-store.ts`, `data/action.ts`;
  resources `data/action.ts`, `data/bus.ts`; stateful-observable `utils/action.ts`).
  Library options (`active:`, `params:`) are not writers. Helpers with other
  names (resources `bus.bump(...)`) are not counted.

Lifetime: `app` = provided at root; `session` = inside the signed-in frame;
`component` = owned by one component.

## Per approach

### vanilla-rxjs

| Holder | Holds | Lifetime | Reset at logout by |
| --- | --- | --- | --- |
| `data/sources.ts:64-89` 15 `Query` instances: `profile` (64), `notifications` (65), `customers` (71), `customer` (72), `orders` (73), `orderStats` (74), `activity` (75), `cart` (81), `tickets` (82), `ticketsByOrder` (83), `ticket` (84), `notes` (85), `order` (86), `shipment` (87), `searchProducts` (89) | server data | app | `sources.ts:122-138` `clearSession` for the 14 session queries; `searchProducts` (`:89`) is public and not in that list |
| `data/sources.ts:94`, `100`, `101` `agents`, `tiers`, `ticketCounts` (`EntityCache`) | server data | app | `sources.ts:139` `clear()` |
| `data/sources.ts:107`, `113`, `114` `products`, `prices`, `stock` (`EntityCache`, public) | server data | app | nothing (`sources.ts:140`: kept across sessions) |
| `data/query.ts:28` `Entry.state$` and `:90` `entries` Map, per `Query` and per key | server data | app | `query.ts:137-140` `Query.clear()` |
| `data/query.ts:31-32` `Entry.inflight` and `poll` subscriptions, per key | in-flight bookkeeping | app | `query.ts:137-140` (`dispose` on clear) |
| `data/entity-cache.ts:9` `Slot.subject` and `:36` `slots` Map, per `EntityCache` and per id | server data | app | `entity-cache.ts:84-88` `clear()` |
| `data/entity-cache.ts:10-14` `Slot` fields (`observers`, `fetching`, `queued`, `stale`, `batch`) and `:37` `pending` Set | in-flight bookkeeping | app | `entity-cache.ts:84-88` (`slots` and `pending` cleared; the `Slot` objects go with them) |
| `data/entity-cache.ts:38` `scheduled` flag | in-flight bookkeeping | app | nothing (`clear()` does not touch it) |
| `data/console.store.ts:119` `signedIn$` | other: session flag | app | `:703` `signedIn$.next(false)` in `logout()` |
| `data/console.store.ts:120` `epoch` | in-flight bookkeeping | app | nothing; `:702` `epoch++` makes older writes drop |
| `data/console.store.ts:121` `typed$` | UI state (search text as typed) | app | `:706` |
| `data/console.store.ts:122` `query$` | UI state | app | `:707` |
| `data/console.store.ts:123` `selected$` | UI state (selected customer) | app | `:704` `selectCustomer(null)`, which sets it at `:582` |
| `data/console.store.ts:124` `tab$` | UI state | app | `:705` |
| `data/console.store.ts:125` `panel$` | UI state | app | `:704` via `selectCustomer(null)` (`:583`) |
| `data/console.store.ts:126` `editing$` | UI state | app | `:704` via `selectCustomer(null)` (`:584`) |
| `data/console.store.ts:128` `notificationsOpen$` | UI state | app | component destroyed (`vanilla-rxjs-console.component.ts:116`); not in `logout()` |
| `data/console.store.ts:130` `searchText$` | UI state (order editor search) | app | `:146` on each `editing$` change |
| `data/console.store.ts:134` `login$` | write status | app | nothing |
| `data/console.store.ts:135-139` `save$`, `reply$`, `note$`, `markRead$`, `resend$` | write status | app | `:708` |
| `data/console.store.ts:158` `agent$`, `:183` `notificationsRaw$`, `:229` `customersRaw$`, `:265` `core$`, `:289` `stats$`, `:317` `shipments$`, `:509` `orderPanel$`, `:557` `ticketPanel$` (each a `shared()` replay, `data/vm.ts:35`) | server data (view models) | component | `logout()` `:703`, `:704` through the `signedIn$` switch (`:152`) or the `selected$` and `panel$` streams these read; buffer dropped with the last subscriber (`vm.ts:35` `refCount: true`) |
| `data/console.store.ts:325` `shared()` in `onTab` (`:320-327`), one replay per call: `cartRaw$` (`:354`), `tickets$` (`:360`), `notesRaw$` (`:366`) | server data (view models) | component | `logout()` `:704` through `selected$`, which `onTab` reads at `:321` |

| Q | Answer | Evidence |
| --- | --- | --- |
| Q1 Holders of server data | 32 (21 caches + 11 replay instances: 8 `shared()` declarations, and `onTab` used three times) | `data/sources.ts:64-114`; `data/console.store.ts:155-557`, `:354`, `:360`, `:366` |
| Q2 Files that read the session or selected customer | 3: `data/console.store.ts`, `vanilla-rxjs-console.component.ts`, `components/customers/customer-list/customer-list-section.component.ts` | `data/console.store.ts:152` `this.signedIn$.pipe(`; `:237` `this.selected$.pipe(`; `vanilla-rxjs-console.component.ts:119` `toSignal(this.s.signedIn$`; `:121` `toSignal(this.s.selected$`; `customer-list-section.component.ts:47` `toSignal(this.s.selected$` |
| Q3 Imperative writers outside source definitions | 33: `data/console.store.ts` (29 call sites at lines 146, 563, 567, 569, 578, 582-584, 588-589, 593-594, 598-599, 689, 693-694, 696, 703, 705-708, 716, 720, 724, 734-735, 754); `components/customers/customer-detail/tabs/customer-tabs-section.component.ts:17` (`s.tab$.next`); `components/notifications/notifications-section.component.ts:26` (`s.notificationsOpen$.next`); `components/panels/order-panel/order-panel-section.component.ts:49` (`s.editing$.next`); `vanilla-rxjs-console.component.ts:116` (`s.notificationsOpen$.next`) | `data/console.store.ts` as listed; the four component lines as listed |
| Q4 Server-data holders not reset at logout and not public (R-S4) | none | `data/sources.ts:122-140` (every non-public holder is cleared) |

Notes:
- `login$` is the only write status that `logout()` does not reset; `:708` resets the other five.
- The `shared()` replays drop their buffer when the last subscriber leaves (`data/vm.ts:35`).
- `signedIn$` and the `selected$` switch reset the replays without a line of their own.

### ngrx-signal-store

| Holder | Holds | Lifetime | Reset at logout by |
| --- | --- | --- | --- |
| `data/ui-state.ts:29` `signedIn` (`withState`) | other: session flag | app | `data/ui-state.ts:46` `signOut` |
| `data/ui-state.ts:30-34` `selected`, `panel`, `tab`, `editing`, `searchText`; `:36-37` `typedText`, `query` (`withState`) | UI state | app | `data/ui-state.ts:46` `signOut` |
| `data/ui-state.ts:35` `notificationsOpen` (`withState`) | UI state | app | nothing in `signOut`; component destroyed (`signal-store-console.component.ts:117`) |
| `data/entity-store.ts:28-29` `values` state and `withEntities` (one store per `createKeyedCache`: 21 stores at `data/sources.ts:50-133`) | server data | app | `data/auth.ts:25` `cache.clear()` for the 17 `SESSION_CACHES` (`data/sources.ts:139-157`); `entity-store.ts:96-100` is the `clear()` they run; the 4 public stores (`sources.ts:107`, `125`, `129`, `133`) are never cleared |
| `data/entity-store.ts:36` `observers` Map and `:38` `inFlight` Map (one pair per store); `:43` `stop` Subject per read | in-flight bookkeeping | app | `entity-store.ts:96-100` for the 17 session stores |
| `data/action.ts:7` `state` signal, one per `createAction`: `data/auth.ts:15` (`login`) | write status | app | nothing |
| `components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:53` (`addNote`), `components/notifications/notifications-section.component.ts:65` (`markAllRead`), `components/panels/order-panel/order-panel-section.component.ts:130` (`save`), `:138` (`resend`), `components/panels/ticket-panel/ticket-panel-section.component.ts:86` (`reply`) | write status | component | component destroyed |

| Q | Answer | Evidence |
| --- | --- | --- |
| Q1 Holders of server data | 21 | `data/sources.ts:50-133` (21 `createKeyedCache`) |
| Q2 Files that read the session or selected customer | 2: `signal-store-console.component.ts`, `components/customers/customer-list/customer-list-section.component.ts` | `signal-store-console.component.ts:63` `@if (!ui.signedIn())`; `:66`, `:72`, `:79`, `:86` `ui.selected()`; `customer-list-section.component.ts:52` `[selectedId]="ui.selected()"` |
| Q3 Imperative writers outside source definitions | 15: `data/ui-state.ts:45-69` (13 `patchState` call sites); `components/panels/order-panel/order-panel-section.component.ts:153` `this.orderCache.set(orderId, saved)`; `components/panels/ticket-panel/ticket-panel-section.component.ts:101` `this.cache.set(ticketId, thread)` | the lines as listed |
| Q4 Server-data holders not reset at logout and not public (R-S4) | none | `data/auth.ts:25` clears all 17 non-public stores |

Notes:
- No `signal(` or `linkedSignal(` appears in any component; section components hold only the five `createAction` states listed above.
- `cacheEntry` and `cacheEntries` values are `computed` and derived, not holders (`data/entity-store.ts:127-177`).
- `notificationsOpen` is not reset by `signOut`; it is reset only when the console component is destroyed.

### resources

| Holder | Holds | Lifetime | Reset at logout by |
| --- | --- | --- | --- |
| 12 registries, one `Map` of `rxResource` per key: `data/activity.registry.ts:23`, `cart-prices.registry.ts:33`, `cart.registry.ts:22`, `customer-list.registry.ts:23`, `customers.registry.ts:23`, `order-stats.registry.ts:24`, `orders.registry.ts:24`, `prices.registry.ts:24`, `products.registry.ts:22`, `stock.registry.ts:24`, `ticket-counts.registry.ts:25`, `tiers.registry.ts:24` | server data | session (provided in `resources-signed-in.component.ts:47-59`) | component destroyed: sign-out removes the frame at `resources-console.component.ts:45` |
| 10 component `rxResource`s: `components/agent/agent-section.component.ts:31` `profile`; `components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component.ts:30` `res`; `components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:38` `res`; `components/customers/customer-detail/tabs/tickets-tab/tickets-tab-section.component.ts:42` `res`; `components/fields/agent-name/agent-name.component.ts:22` `res`; `components/notifications/notifications-section.component.ts:36` `notifications`; `components/panels/order-panel/order-panel-section.component.ts:65` `order`, `:71` `linkedTickets`, `:98` `hits`; `components/panels/ticket-panel/ticket-panel-section.component.ts:65` `threadRes` | server data | component | component destroyed |
| `data/ui-state.ts:24` `signedIn` (`signal`) | other: session flag | app | `data/ui-state.ts:52-61` `signOut` (`:53`) |
| `data/ui-state.ts:25-29`, `:31-32` `selected`, `panel`, `tab`, `editing`, `searchText`, `typedText`, `query` (`signal`) | UI state | app | `data/ui-state.ts:52-61` `signOut` |
| `data/ui-state.ts:30` `notificationsOpen` (`signal`) | UI state | app | nothing in `signOut`; component destroyed (`resources-console.component.ts:73`) |
| `data/bus.ts:13-18` six `signal(0)` counters (`orders`, `orderStats`, `stock`, `tickets`, `ticketsByOrder`, `ticketCounts`) | other: version counter (no data) | app | nothing |
| `data/action.ts:7` `state` signal, one per `createAction`: `data/auth.ts:13` (`login`) | write status | app | nothing |
| `components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:43`, `components/notifications/notifications-section.component.ts:40`, `components/panels/order-panel/order-panel-section.component.ts:103`, `:111`, `components/panels/ticket-panel/ticket-panel-section.component.ts:74` (`createAction` states) | write status | component | component destroyed |

| Q | Answer | Evidence |
| --- | --- | --- |
| Q1 Holders of server data | 22 (12 registry `Map`s and 10 component `rxResource`s) | `data/*.registry.ts:22-25`; the 10 component lines in the table above |
| Q2 Files that read the session or selected customer | 3: `resources-console.component.ts`, `resources-signed-in.component.ts`, `components/customers/customer-list/customer-list-section.component.ts` | `resources-console.component.ts:45` `@if (!ui.signedIn())`; `resources-signed-in.component.ts:62` `ui.selected() !== null`, `:68`, `:75`, `:82`; `customer-list-section.component.ts:31` `[selectedId]="ui.selected()"` |
| Q3 Imperative writers outside source definitions | 27: `data/ui-state.ts:43-106` (25 call sites, `set` or `update`); `components/panels/order-panel/order-panel-section.component.ts:119` `this.order.set(saved)`; `components/panels/ticket-panel/ticket-panel-section.component.ts:87` `this.threadRes.set(updated)` | the lines as listed; `bus.bump(...)` calls (`order-panel-section.component.ts:120`, `:122`; `ticket-panel-section.component.ts:88`) are not counted |
| Q4 Server-data holders not reset at logout and not public (R-S4) | none | `resources-signed-in.component.ts:47-59` (the 12 registries are in the frame; the public `products`, `prices`, `stock` are dropped with it too) |

Notes:
- No logout line clears server data; the reset is the destruction of the signed-in frame.
- `cart-total.component.ts:34` builds a local `Map` inside a projection and is not a holder.
- The `bus` counters hold no data; they tell the readers to refetch.

### stateful-observable

| Holder | Holds | Lifetime | Reset at logout by |
| --- | --- | --- | --- |
| `sources/lookups.ts:47` `CUSTOMER_BY_ID`, `:56` `OPEN_TICKETS_BY_CUSTOMER`, `:69` `ORDER_STATS_BY_CUSTOMER`, `:78` `ORDERS_BY_CUSTOMER`, `:86` `TIER_BY_CUSTOMER`, `:99` `CART_BY_CUSTOMER`, `:107` `NOTES_BY_CUSTOMER`, `:122` `ACTIVITY_BY_CUSTOMER`, `:131` `TICKETS_BY_CUSTOMER`, `:141` `ORDER_BY_ID`, `:149` `SHIPMENT_BY_ORDER`, `:158` `TICKETS_BY_ORDER`, `:166` `TICKET_BY_ID`, `:174` `AGENT_NAME` (14 user-scope tokens, each with `active: inject(LOGGED_IN)`) | server data (one stream per id) | app | `active` falling at logout: the library drops every kept entry (`src/app/submodules/stateful-observable/src/factory.ts:161-170`; entries in `src/app/submodules/stateful-observable/src/cache.ts:47`) |
| `sources/lookups.ts:186` `PRODUCT_NAME`, `:197` `CURRENT_PRICE`, `:209` `STOCK_BY_SKU` (public; no `active` option) | server data (public) | app | nothing: kept across sessions |
| `components/agent/agent-section.component.ts:25` `profile`; `components/customers/customer-list/customer-list-section.component.ts:68` `page`; `components/notifications/notifications-section.component.ts:41` `notifications`; `components/panels/order-panel/order-panel-section.component.ts:109` `hitsSlot` (`statefulObservable`) | server data | component | `active` at `agent-section.component.ts:27`, `customer-list-section.component.ts:85`, `notifications-section.component.ts:51`; `hitsSlot` has no `active`: component destroyed (inside `console-page.component.ts:79` `@if (loggedIn())`) |
| `utils/action.ts:19` `calls$` Subject and `:20` `result` `statefulObservable`, one pair per `action(`: `components/customers/customer-detail/tabs/notes-tab/notes-tab-section.component.ts:46`, `components/notifications/notifications-section.component.ts:55`, `components/panels/order-panel/order-panel-section.component.ts:137` (`updateOrder`), `:171` (`resend`), `components/panels/ticket-panel/ticket-panel-section.component.ts:67` (`replyTicket`) | other: intent stream (`calls$`); write status (`result`) | component | `active` at `utils/action.ts:24` (`result`); `calls$` has no reset |
| `sources/session.ts:21` `CREDENTIALS` and `:25` `LOGOUT_CLICKS` Subjects | other: intent stream (no value) | app | nothing |
| `sources/session.ts:32` `LOGIN` and `:46` `LOGOUT` `statefulObservable`s | write status | app | nothing |
| `sources/session.ts:61-75` `LOGGED_IN` (`shareReplay`, `refCount: false`) | other: session flag | app | not reset; it is the source of the reset: `false` at `:67-68` as soon as a logout starts |
| `sources/session.ts:87` `LAST_TAB` signal | UI state (tab preference) | app | `sources/session.ts:88` `tab.set('orders')` on `LOGOUT_CLICKS` |
| `console-page.component.ts:171` `customerId` and `:172` `panel` signals | UI state (selected customer, open panel) | component | `console-page.component.ts:194-195` in `selectCustomer(null)`, called from `logout()` (`:188-189`) |
| `components/customers/customer-list/customer-list-section.component.ts:55` `query` signal | UI state | component | component destroyed (inside `console-page.component.ts:79`) |
| `components/customers/customer-detail/tabs/customer-tabs-section.component.ts:73` `tab` and `:85` `opened` (`linkedSignal`s) | UI state | component | component destroyed |
| `components/panels/order-panel/order-panel-section.component.ts:84` `editing` and `:88` `text` (`linkedSignal`s) | UI state | component | component destroyed; a new order resets them (`source` at `:85`, `:89`; `computation` at `:86`, `:90`) |

| Q | Answer | Evidence |
| --- | --- | --- |
| Q1 Holders of server data | 21 (17 lookup tokens and 4 section `statefulObservable` nodes) | `sources/lookups.ts:47-209` (17 tokens); `agent-section.component.ts:25`, `customer-list-section.component.ts:68`, `notifications-section.component.ts:41`, `order-panel-section.component.ts:109` |
| Q2 Files that read the session or selected customer | 6: `console-page.component.ts`, `components/agent/agent-section.component.ts`, `components/customers/customer-list/customer-list-section.component.ts`, `components/notifications/notifications-section.component.ts`, `utils/action.ts`, `sources/lookups.ts` | `console-page.component.ts:79` `@if (loggedIn())`, `:92` `customerId()`; `agent-section.component.ts:27` `active: inject(LOGGED_IN)`; `customer-list-section.component.ts:65`, `:85`; `notifications-section.component.ts:51`; `utils/action.ts:24` `active: inject(LOGGED_IN)`; `lookups.ts:51` `active: inject(LOGGED_IN)` (and 13 more `active:` lines) |
| Q3 Imperative writers outside source definitions | 14: `components/customers/customer-detail/tabs/customer-tabs-section.component.ts:76-77` (`tab.set`, `lastTab.set`); `components/customers/customer-list/customer-list-section.component.ts:105` (`query.update`); `components/panels/order-panel/order-panel-section.component.ts:70` (`text.set`), `:153`, `:176`, `:177` (`editing.set`, `text.set`); `console-page.component.ts:183`, `:188`, `:194`, `:195`, `:199`, `:203`, `:207` | the lines as listed; `sources/session.ts:88` and `utils/action.ts:28` are not counted |
| Q4 Server-data holders not reset at logout and not public (R-S4) | none | the 14 user-scope tokens each have `active: inject(LOGGED_IN)`; the 4 section streams are reset with their component |

Notes:
- The 14 user-scope resets are the library's logout watch, not a line in this approach.
- `PRODUCT_NAME` (`lookups.ts:186`), `CURRENT_PRICE` (`:197`) and `STOCK_BY_SKU` (`:209`) are kept across sessions; none has an `active` option.
- `console-page.component.ts` holds the selected customer; the children receive it through inputs and do not read the holder.

## Side by side

| Approach | Q1 server-data holders | Q2 files reading session or selected customer | Q3 imperative writers | Q4 not reset and not public |
| --- | --- | --- | --- | --- |
| vanilla-rxjs | 32 (21 caches + 11 replays) | 3 | 33 | none |
| ngrx-signal-store | 21 | 2 | 15 | none |
| resources | 22 | 3 | 27 | none |
| stateful-observable | 21 | 6 | 14 | none |

## Verdict

- vanilla-rxjs keeps 21 cache holders (Q1, `data/sources.ts:64-114`) and 11 replay instances (Q1, `data/console.store.ts:158-557`); its 33 writers (Q3) are 29 in `data/console.store.ts` and 4 in components.
- ngrx-signal-store keeps 21 `createKeyedCache` stores (Q1, `data/sources.ts:50-133`), and `data/auth.ts:25` clears 17 of them (Q4); its 15 writers (Q3) are 13 `patchState` calls in `data/ui-state.ts` and 2 in components.
- resources keeps 22 server-data holders (Q1): 12 registries that go with the signed-in frame (Q4 row, `resources-console.component.ts:45`) and 10 component `rxResource`s that go with their component. Its 27 writers (Q3) are 25 `set`/`update` calls in `data/ui-state.ts` and 2 in components.
- stateful-observable keeps 17 library lookup tokens (Q1, `sources/lookups.ts:47-209`), 14 of them reset through `active: inject(LOGGED_IN)`; 6 files read the session or the selected customer (Q2), and `console-page.component.ts` is the one that holds the selected customer.
- All four keep no non-public server-data holder after logout (Q4). vanilla-rxjs and ngrx-signal-store clear by line; resources drops its holders by frame destruction; stateful-observable drops its 14 user-scope entries through the library's `active` flag.
