# 06 · Code the approach had to write

Why: the cost of each approach, and how much of it is machinery a library would provide. Scope: data-layer files only: `vanilla-rxjs/data/`, `ngrx-signal-store/data/`, `resources/data/` plus `resources/resources-signed-in.component.ts` and the 8 section components that call `rxResource(`, and `stateful-observable/sources/`, `utils/`, `vm/`. Paths are relative to `src/app/components/contesters/`.

Counting: the `tools/contest/metrics.mjs` rule (Prettier-formatted, non-blank non-comment lines), applied to each top-level declaration separately. Imports and type-only declarations (`type`, `interface`, `export type {}`) are in no column. Q3 does count the imports and type lines a new lookup would need. Evidence line numbers are raw file lines.

Whole-folder totals from `node tools/contest/metrics.mjs <folder>` (views included): vanilla-rxjs 2823, ngrx-signal-store 1774, resources 1509, stateful-observable 1318.

Decision list as applied:
- per-entity: one declaration template instantiated per entity. Here: `new Query(...)` / `new EntityCache(...)` class members (vanilla), `createKeyedCache(...)` copies (ngrx), `make…` + registry class (resources), `lookup(...)` tokens (stateful), and the one-line `…Of = lookupOf(...)` mappers (vanilla and ngrx, 11 each).
- domain: names an Api class, an entity, a section or a view model.
- generic: all other declarations.

## Per approach

### 06 · vanilla-rxjs

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Lines: generic / per-entity / domain / total | 429 / 166 / 1073 / 1668 | generic: `data/entity-cache.ts:8-17,35-176` (Slot, EntityCache, 140), `data/query.ts:14-162` (116), `data/vm.ts:10-117` (114), `data/block-state.ts:5-26` (17), `data/fetched.ts:14-25` (20), `data/raw-models.ts:45-53` (`lookupOf`, 13), `data/mappers.ts:15-23` (8), `data/view-state.ts:17` (1); per-entity: `data/sources.ts:64-119` (21 members: 15 `new Query`, 6 `new EntityCache`, 97), `data/raw-models.ts:57-105` (11 `…Of = lookupOf(...)`, 69); domain: `data/console.store.ts:94-100,108-774` (932), `data/raw-models.ts:56-109` (42: `own…` mappers and `hitErrorsOf`, other lines are per-entity), `data/mappers.ts:25-74` (64), `data/sources.ts:46-63,120-142` (35: class header, 13 injections, `clearSession`) |
| Q2 Generic code does | per-key cache: yes; batching: yes; ref-counting: yes; cancellation: yes; polling: yes; status/ViewState mapping: yes; keep previous: yes; write action: no | per-key cache `data/query.ts:89` "export class Query<A, T> {"; batching `data/entity-cache.ts:121` "for (let i = 0; i < slots.length; i += MAX_BATCH)"; ref-counting `data/entity-cache.ts:50` "slot.observers++;"; cancellation `data/entity-cache.ts:168` "batch.sub?.unsubscribe();"; polling `data/query.ts:63` "interval(this.opts.pollMs)"; status mapping `data/vm.ts:13` "export const toVm ="; keep previous `data/vm.ts:22` "export const keepPrevious ="; write action no: its `write` helper is a store method, `data/console.store.ts:713` "private write<T>(" (domain) |
| Q3 Cost of one more batched lookup (`tiers`) | 20 lines in 4 files | `data/sources.ts:16` "CustomerTier,"; `data/sources.ts:100` "public readonly tiers = new EntityCache<number, CustomerTier>({" (5 formatted lines); `data/console.store.ts:86` "tiersOf,"; `:201` "tier: mapFetched(tiers[i], (t) => t.tier),"; `:232` "public readonly tiers$ = …" (3 formatted lines); `:681` "this.againIds(this.d.tiers, ids);"; `data/raw-models.ts:14` "TierVm,"; `:64` "export const tiersOf =" (6 formatted lines); `data/mappers.ts:32` "tier: c.tier," |
| Q4 Dependency | `rxjs` (`BehaviorSubject`, `defer`, `interval`, `finalize`). No caching library: cache, batching, ref-counting and polling are hand-written | `data/query.ts:1` "import { BehaviorSubject, defer, finalize, interval, Observable, Subscription } from 'rxjs';" |
| Mechanism | `helper (140)` entity-cache.ts:8-176; `helper (116)` query.ts:14-162; `helper (114)` vm.ts:10-117 | as cited |
| Failing scenarios (from report) | n/a: card 06 lists no scenario ids | `test_report.md` not used for this card |

Notes: Shared lines not counted in Q3 (they also hold another entity's field): `console.store.ts:194` and `:221` (tiers with ticketCounts), `data/sources.ts:139` (clear list), `data/raw-models.ts:29` and `:62` (tier with openTickets). `console.store.ts:90` `export type { Vm }` is type-only, so it is in no column.

### 06 · ngrx-signal-store

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Lines: generic / per-entity / domain / total | 259 / 157 / 202 / 618 | generic: `data/entity-store.ts:25-116` (createKeyedCache, 81), `:127-142` (cacheEntry, 15), `:145-159` (cacheEntryOptional, 21), `:162-163` (SINGLETON, singletonEntry, 10), `:166-174` (poll, 15), `:177-190` (cacheEntries, 22), `data/action.ts:6-20` (17), `data/block-state.ts:6-22` (13), `data/fetched.ts:16-32` (21), `data/vm.ts:8-18` (22), `data/view-state.ts:15` (1), `data/mappers.ts:15-23` (8), `data/raw-models.ts:44-52` (`lookupOf`, 13); per-entity: `data/sources.ts:50-136` (21 `createKeyedCache` copies, 88), `data/raw-models.ts:56-93` (11 `…Of` lookups, 69); domain: `data/auth.ts:9-27` (17), `data/mappers.ts:25-74` (64), `data/raw-models.ts:55-97` (28: `own…` mappers, `orderStatsOf`, `openTicketsCountOf`), `data/sources.ts:139-157` (`SESSION_CACHES`, 19), `data/ui-state.ts:10-76` (74) |
| Q2 Generic code does | per-key cache: yes; batching: no; ref-counting: yes; cancellation: yes; polling: yes; status/ViewState mapping: yes; keep previous: yes; write action: yes | per-key cache `data/entity-store.ts:25` "export const createKeyedCache = <Id extends EntityId, V>(makeLoader: () => (id: Id) => Observable<V>) =>"; batching no: `data/sources.ts:118` "return (id) => api.tiers([id]).pipe(map(([t]) => t));"; ref-counting `data/entity-store.ts:64` "observers.set(id, (observers.get(id) ?? 0) + 1);"; cancellation `data/entity-store.ts:81` "const stop = inFlight.get(id);"; polling `data/entity-store.ts:166` "export const poll ="; status mapping `data/vm.ts:11` "export const toVm = <T>("; keep previous `data/entity-store.ts:42` "hadValue ? 'reloading' : 'loading'"; write action `data/action.ts:6` "export const createAction = <Arg, Result>(" |
| Q3 Cost of one more batched lookup (`tiers`) | 14 lines in 3 files (`tiers` is read one id per call here, see Q2 batching) | `data/sources.ts:16` "CustomerTier,"; `:116-119` "export const TIER = createKeyedCache<number, CustomerTier>(() => {" (4 lines); `:155` "TIER," (SESSION_CACHES); `data/raw-models.ts:13` "TierVm,"; `:63` "export const tiersOf =" (6 formatted lines); `data/mappers.ts:32` "tier: c.tier," |
| Q4 Dependency | `@ngrx/signals` (`patchState`, `signalStore`, `withEntities`, `withMethods`), `@ngrx/signals/entities` (`setEntity`, `removeEntity`), `rxjs` (`interval`, `takeUntil`, `switchMap`). The per-key map, in-flight subjects and observer counts are hand-written | `data/entity-store.ts:3` "import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';" |
| Mechanism | `helper (81)` createKeyedCache, entity-store.ts:25-116; `helper (17)` createAction, action.ts:6-20 | as cited |
| Failing scenarios (from report) | n/a: card 06 lists no scenario ids | `test_report.md` not used for this card |

Notes: `data/sources.ts:50-136` is 21 `createKeyedCache` declarations with different loaders, so they are per-entity by rule 1. The shared `tier` field line `data/raw-models.ts:28` also holds `openTickets`, so it is not in Q3. `tiers` has no batch collection in this approach (`data/sources.ts:5-9`).

### 06 · resources

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Lines: generic / per-entity / domain / total | 31 / 320 / 422 / 773 | generic: `data/action.ts:6-20` (17), `data/cart-prices.registry.ts:6-10` (`chunk`, 6), `data/mappers.ts:6` and `:8-14` (`unique`, `initialsOf`, 8); per-entity (12 registries, `make…` + class each): `data/activity.registry.ts:6-34` (27), `data/cart-prices.registry.ts:13-21` and `:29-45` (35), `data/cart.registry.ts:6-33` (23), `data/customer-list.registry.ts:6-34` (27), `data/customers.registry.ts:6-34` (27), `data/order-stats.registry.ts:6-36` (28), `data/orders.registry.ts:6-36` (24), `data/prices.registry.ts:7-35` (23), `data/products.registry.ts:6-33` (27), `data/stock.registry.ts:6-36` (28), `data/ticket-counts.registry.ts:7-37` (28), `data/tiers.registry.ts:7-35` (23); domain: `data/auth.ts:8-24` (15), `data/bus.ts:11-23` (12), `data/mappers.ts:16-45` (42), `data/ui-state.ts:9` and `:22-108` (84), `resources-signed-in.component.ts:32-94` (34), section components (235): `components/agent/agent-section.component.ts:14-38` (16), `components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component.ts:9-35` (16), `…/tabs/notes-tab/notes-tab-section.component.ts:15-50` (20), `…/tabs/tickets-tab/tickets-tab-section.component.ts:17-49` (22), `components/fields/agent-name/agent-name.component.ts:7-24` (15), `components/notifications/notifications-section.component.ts:16-52` (24), `components/panels/order-panel/order-panel-section.component.ts:23-129` (73), `components/panels/ticket-panel/ticket-panel-section.component.ts:22-29` and `:32-95` (49) |
| Q2 Generic code does | per-key cache: no (a `Map` in each registry, per-entity); batching: yes; ref-counting: no; cancellation: no (rxResource, not checked); polling: no (data layer; the polls are in sections); status/ViewState mapping: no; keep previous: no; write action: yes | per-key `data/cart.registry.ts:22` "private readonly byId = new Map<number, ReturnType<typeof makeCartResource>>();"; batching `data/cart-prices.registry.ts:18` "const groups = chunk(params, MAX_BATCH);"; polls outside the data layer `components/notifications/notifications-section.component.ts:48` "interval(30_000)"; write action `data/action.ts:6` "export const createAction = <Arg, Result>(perform: (arg: Arg) => Observable<Result>) => {" |
| Q3 Cost of one more batched lookup (`tiers`) | 30 lines in 3 files | `data/tiers.registry.ts:1-35` (whole file: 4 imports, 23 code); `resources-signed-in.component.ts:17` "import { TiersRegistry } from './data/tiers.registry';"; `:50` "TiersRegistry,"; `data/mappers.ts:23` "tier: c.tier," |
| Q4 Dependency | `@angular/core/rxjs-interop` (`rxResource`) for fetch, params and reload. Behaviour of `rxResource` (cancel on params change, dedup) not checked in library source | `data/activity.registry.ts:2` "import { rxResource } from '@angular/core/rxjs-interop';" |
| Mechanism | `per-entity (23-35 × 12)` registries; `helper (17)` action.ts:6-20; `helper (6)` chunk, cart-prices.registry.ts:6-10 | as cited |
| Failing scenarios (from report) | n/a: card 06 lists no scenario ids | `test_report.md` not used for this card |

Notes: the section scope is the 8 files that call `rxResource(` (`grep -l "rxResource("`). `cart-prices.registry.ts` is the only registry that batches. The view `components/customers/customer-list/customer-tier/customer-tier.component.ts` is outside scope and is not counted for any approach.

### 06 · stateful-observable

| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Lines: generic / per-entity / domain / total | 48 / 141 / 112 / 301 | generic: `sources/lookups.ts:24` (`BATCH_TIME_MS`, 1), `:42-43` (`lookup`, 2), `sources/session.ts:19-26` (`CREDENTIALS`, `LOGOUT_CLICKS`, 8), `:61-75` (`LOGGED_IN`, 15), `utils/action.ts:15-29` (`action`, 15), `vm/vm.ts:31-37` (`initialsOf`, 7); per-entity: `sources/lookups.ts:47-216` (17 `lookup(...)` tokens, 141); domain: `sources/session.ts:28-54` (`LOGIN`, `LOGOUT`, 26), `:84-91` (`LAST_TAB`, 11), `vm/vm.ts:24-29,39,41-115` (`toAgentVm`, `hitInitials`, `toHeaderVm`, `toOrderRowVm`, `toTicketRowVm`, `toOrderVm`, `linkedTicketOf`, `toThreadVm`, `toShipmentVm`, 75) |
| Q2 Generic code does | per-key cache: not checked (library factory, see Q4); batching: not checked (`batchTime` configured, see Mechanism); ref-counting: not checked (`refCount: false` on batch tokens only); cancellation: not checked; polling: no (data layer; the polls are in sections); status/ViewState mapping: no; keep previous: no; write action: yes | write action `utils/action.ts:15` "export const action = <A, R>("; configuration `sources/lookups.ts:91` "batchTime: BATCH_TIME_MS,"; `:94` "refCount: false,"; polls in a section `components/notifications/notifications-section.component.ts:44` "timer(0, 30_000).pipe(" |
| Q3 Cost of one more batched lookup (`tiers`) | 13 lines in 2 files | `sources/lookups.ts:86-97` (`TIER_BY_CUSTOMER`, 12 lines: the `lookup(` token and its `statefulObservableBatchFactory({` options); `vm/vm.ts:46` "tier: c.tier," |
| Q4 Dependency | `stateful-observable` library (git submodule, re-exported): `statefulObservableFactory`, `statefulObservableBatchFactory`, `statefulObservable`. Options used: `cacheSize`, `batchTime`, `maxBatchSize`, `refCount`, `active`. Library internals not checked | `stateful-observable/lib.ts:2` "export * from '../../../submodules/stateful-observable/src';" |
| Mechanism | configuration: `batchTime` sources/lookups.ts:91, `cacheSize` `:95`; `helper (15)` action, utils/action.ts:15-29; `helper (2)` lookup, lookups.ts:42-43 | as cited |
| Failing scenarios (from report) | n/a: card 06 lists no scenario ids | `test_report.md` not used for this card |

Notes: each of the 17 `lookup(...)` declarations names one endpoint and carries its own factory call, so they are per-entity. `LOGGED_IN` names the two write tokens only, so it is generic. Section components are outside scope.

## Side by side

| Approach | Q1 generic | Q1 per-entity | Q1 domain | Q1 total | Q2 yes (of 8) | Q3 lines (files) | Q4 dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vanilla-rxjs | 429 | 166 (97 members + 69 lookups) | 1073 | 1668 | 7: all but write action | 20 (4) | rxjs |
| ngrx-signal-store | 259 | 157 (88 copies + 69 lookups) | 202 | 618 | 7: all but batching | 14 (3) | @ngrx/signals, rxjs |
| resources | 31 | 320 (12 registries) | 422 | 773 | 2: batching, write action | 30 (3) | @angular/core/rxjs-interop |
| stateful-observable | 48 | 141 (17 lookups) | 112 | 301 | 1 checked: write action; 4 not checked, 3 no | 13 (2) | stateful-observable (submodule) |

## Verdict

- Vanilla: generic 429 lines hold per-key cache, batching, ref-counting, cancellation, polling, status mapping and keep previous (Q2, vanilla row); one more batched lookup costs 20 lines in 4 files (Q3).
- ngrx-signal-store: generic 259 lines hold the same set except batching, plus write action (Q2); `tiers` is read one id per call (`data/sources.ts:118`), so Q3 is 14 lines in 3 files.
- Resources: generic 31 lines hold the `chunk` batching helper and write action (Q2); the per-key `Map` is inside each of 12 registries (per-entity 320), and Q3 is 30 lines in 3 files, 27 of them in `data/tiers.registry.ts`.
- Stateful-observable: generic 48 lines hold the write action, the session tokens and the lookup helper (Q2); caching and batching are library options on the 17 lookups (per-entity 141; `sources/lookups.ts:91`, `:94`, `:95`), and Q3 is 13 lines in 2 files.
- Domain column (Q1): vanilla 1073, ngrx-signal-store 202, resources 422, stateful-observable 112 lines; the domain lines name the sections, endpoints and view models.
