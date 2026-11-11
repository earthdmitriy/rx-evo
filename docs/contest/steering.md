# Steering

Every contester is written by an agent. These are the rulings applied on top
by hand, for the kit and for each contester. Each point says what the
situation was (**Context**), what was wrong with it (**Problem**) and what was
decided (**Steering**). Section 1 applies to every approach; sections 2 and 3
to the two contesters that were steered. Section 4 checks whether the
library's recipes now carry the section 3 rulings.

## 1. Generic steering

### 1.1 View models carry data only

**Context:** the first version of the kit's view models carried status: each field from another service was a `Part<T>` (`{ state, value }`), with its own loading UI and Retry.

**Problem:** every approach had to write adapters to build `Part`s, and a field that is "loading" has no value, so a reload wiped the content.

**Steering:**
- No status in a view model and no `Part`-style wrapper.
- A field from another service is `T | undefined`: absent until it arrives, shown as an empty space. `null` is real data.
- Section views take `Vm | null`.
- Sections keep their blocks (`app-spinner-block`, `app-view-block`). Nothing below a section has a prescribed loading UI.
- Bind a spinner or dimming to the pending state and content to the value. Never combine them into one "state" value: that wipes content on reload.

### 1.2 Field components

**Context:** values from another service (names, prices, tiers, counters) first came into the views as lookup records (`Lookup<V>` per service), then, in a pilot, as an abstract class with a shared template.

**Problem:** records forced every implementation to build a join and a record per service; the abstract class forced signals and had no test id or loading state. Both imposed one approach's shape on the others.

**Steering:** each such value is a skeleton component behind a token in `shared/fields.ts` (product name, price, stock, customer tier, open tickets, KPI, agent name, customer name, shipment tracking, line total, cart total, and the action `HitAdd`). The kit gives the template; the implementation fills in how the value is fetched.
- Each reads the error of its own stream and renders an empty cell on error. No retry.
- Each has its own `data-testid` and a spinner block bound to its pending state.
- Values the view computes with (line and cart total, Add enabled, the price difference in the editor) are field components too, not record inputs.
- `HitAdd` takes an `onAdd` callback input, because the outlet binds inputs only.
- A field inside a sentence ("Viewed <name>") renders its prefix only together with its value.
- The block draws a `<div>`; inline fields use the shared class `field-block` from `src/styles.css`.
- Accepted trade-offs: `variant`/`kind` inputs when one value has several visual forms; the skeletons are partly a contract by convention, checked by `skeleton.spec.ts`; one component per cell is fine at these list sizes.

### 1.3 Folder layout

**Context:** the first implementations kept all components as one flat list.

**Problem:** a flat list says nothing about who renders what, and goes against the usual practice that a child lives under the component that uses it.

**Steering:**
- All components live under one `components/` folder.
- A child component sits in a subfolder of the component that renders it.
- A field with several parents sits in the `fields/` folder of their lowest common ancestor.
- `data/`, `sources/`, `utils/`, `vm/` and `lib.ts` sit beside `components/`.
- The entry point stays at the root of the implementation (`console-page.component.ts`), because routes and page tests import it there.
- Templates are inline; one file per component.

### 1.4 Blocks

**Context:** the kit had one stateful block for a section's loading and error state.

**Problem:** one block shape ties every contester to one way of passing state (a stream, flags, or a resource).

**Steering:** the block is split into shapes, and a contester may use any of them; the tests accept all:
- `app-spinner-block`
- `app-stateful-block`
- `app-view-block`
- `app-resource-block`

### 1.5 Resources and ngrx stores from their own primitives

**Context:** on the first try, the agent built the resources and ngrx-store entries by borrowing the test oracle's implementation.

**Problem:** the entries then measured the oracle's RxJS classes, not the tools they were named after.

**Steering:**
- The borrowed implementations were removed.
- In later sessions agents were forbidden to borrow code from another solution: each entry is built from its own tool's primitives.

### 1.6 Old data under the spinner is allowed (R-C2)

**Context:** the first version of the kit and suite read R-C2 as "no data of the previous key may be shown while the next one loads".

**Problem:** when a new request starts, the streams do not emit the previous key's data again; the `async` pipe in the template simply keeps the last value it received until the next one arrives. So the old data on screen comes from the template, not from the libraries, yet every approach needed key tags and other workarounds in its data layer to hide it, although the spinner already says the content is not current.

**Steering:** R-C2 as intended from the start: while a block loads, the previous key's data may stay under its spinner; once it stops loading, it shows only the current key.

### 1.7 Three batch endpoints, not six

**Context:** the fake API had six batch endpoints, one per lookup.

**Problem:** a real backend has batch endpoints only where separate requests would be too frequent; six made every lookup a batching problem.

**Steering:** `tiers`, `ticketCounts` and `prices` take up to 20 ids; `agent`, `product` and `stock` take one id. Per typical session, list pages ask about 80 tiers and 80 counters and prices about 54, while product names are kept for the session, stock is asked only in the editor and the agent directory is tiny.

### 1.8 R-S5 narrowed

**Context:** R-S5 asked that a navigation to another page and back keeps the session, the selected customer, the tab and the open panel.

**Problem:** keeping which record is open across a navigation needs page-level global state, which "UI state lives in components" exists to avoid.

**Steering:** a navigation keeps the session and the tab preference. The selected customer and the open panel are page state: not required to survive, and not forbidden either (a root store that keeps them is fine).

### 1.9 Cancel and cache are both real

**Context:** a superseded read must be cancelled (B1, B8) and a loaded key must be served from cache (C3, C6, C10, C14); in the statefulObservable entry one switch (`refCount`) served only one of the two.

**Problem:** the question was whether that was a real conflict or an artifact of the tests.

**Steering:** both are ordinary requirements for the same entity, kept in the suite. The library was changed instead: an entry keeps its last completed load, and `refCount` only decides whether a load in flight is cancelled.

### 1.10 What "Bad" in a README may list

**Context:** the READMEs' "Bad" lists grew with mechanism notes, facts of the framework, trade-offs explained elsewhere and stale claims.

**Problem:** they read as defects, though nothing failed.

**Steering:** "Bad" lists only a failing test (id and visible symptom) or excess code needed for a real requirement, with that requirement named (codified in `spec.md` §11).

### 1.11 The test oracle is not a model solution

**Context:** the first full implementation of the page was called "the reference".

**Problem:** the name read as "the way to write it".

**Steering:** it is the test oracle (`contesters/test-oracle`): it passes every scenario and carries the defect switches that validate the suite.

### 1.12 Bases carry no finished entry

**Context:** `make-base` builds the starting point of a stage from this repository.

**Problem:** a finished implementation in the repository could leak into the base of its own stage 1.

**Steering:** `make-base` removes every approach folder from a base before writing the stub.

## 2. Steering for resources

### 2.1 Shared data lifetime

**Context:** `resource()` has no cache and no invalidation of its own; shared data first lived in root-provided injectables.

**Problem:** a root singleton outlives the session, so user data stayed after logout.

**Steering:**
- Shared data lives in services that are not `providedIn: 'root'`: one registry per entity (`data/*.registry.ts`), a `Map` of `rxResource`s created with the registry's injector.
- The registries are in the providers of the signed-in frame (`resources-signed-in.component.ts`), so logout disposes them with everything they hold.

### 2.2 No reference counting, no eviction

**Context:** a kept registry entry is never cancelled, so a superseded shared read keeps running (B1).

**Problem:** fixing it needs reference counting of the readers of each entry.

**Steering:** not added; a registry entry lives for the session, with no observer counts and no eviction. Reference counting is what RxJS gives out of the box, and the contest compares each solution on its own, not combined with another approach's machinery. B1 stays failing.

### 2.3 Cache and cancel exclude each other

**Context:** two attempts to cache more: an order registry (C6, a reopened order from cache) and root-scoped catalog registries (A7, the catalog survives logout).

**Problem:** the order registry broke B8 (a superseded order read is cancelled); the root-scoped registries ran their effects inside the page harness's change detection and broke about 60 tests.

**Steering:** both reverted. The order panel keeps a component-owned resource (cancelled with its params, not cached), and the catalog is disposed at logout. C6 and A7 are recorded as gaps.

### 2.4 Where `resource()` fits

**Context:** the first gap list counted resources' failures one by one.

**Problem:** that reads as "`resource()` is bad", when the failures come from using it for a job it is not built for.

**Steering:**
- Its README and `gaps.md` say where it fits: one read owned by one component or service, with no extra code on a simple page with no shared data; not a shared cache.
- Writes that invalidate by a version folded into the registry key (`data/bus.ts`) are recorded as an implementation miss (B3, C16): `reload()` on the registry entries a write changed would keep the value and touch only those keys.

## 3. Steering for stateful observable

### 3.1 Entities in tokens, UI-state sources in components

**Context:** the agent's first plan kept every source in one shared registry service.

**Problem:** one service for everything hides which data a section loads and gives every source the same lifetime. When asked for tokens, the agent first made a token of every source, then sorted them by how many components read each one, which made the cart and the orders behave differently.

**Steering:**
- A server entity addressed by an id is a factory token, one per entity (`sources/lookups.ts`), so the dataflow is atomic.
- A source keyed by UI state (the customer list's query, the editor's search text) is a stateful source of the component that owns that state.
- How many components read a source today is not a property of the data, so it decides nothing.

### 3.2 Reading keyed entities

**Context:** a factory gives an entry per key; the views need the entry of the shown key, of a list of keys, or of every row.

**Problem:** the agent combined per-key streams by hand: lookup records, connections with key tags, key checks in helpers.

**Steering:**
- A view that follows a key reads `token.project(toObservable(key))`; `projectMany` follows a list of keys (the cart total); `get(key)` is for one stream per key.
- All of them are the same entry per key: one request, one state, and a `reload()` from any of them refreshes every projection. A write reloads `token.get(id)` of what it changed.
- The three batch endpoints use `statefulObservableBatchFactory` (`idOf`, `batchTime`, `maxBatchSize`) with the same `get` / `project` API.

### 3.3 UI state lives in components

**Context:** after the first steering, the agent moved the query, the selected customer, the tab, the open panel and the edit mode into shared root tokens, with an intents service as their only writer.

**Problem:** that is application-wide mutable state with a hand-written dispatcher, and the root lifetime needed manual resets that unmounting gives for free.

**Steering:**
- Ids go down as inputs, events up as outputs; a component's own signal feeds its sources through `toObservable`.
- The one exception is `LAST_TAB` (`sources/session.ts`): a display preference kept across navigation (R-S5), reset on logout (R-S4).

### 3.4 Session invalidation through `active`

**Context:** user data must be dropped at logout.

**Problem:** not obvious to the agent, which wrote a logout handler calling `reset(true)` on factories, next to an `active` option that already does it.

**Steering:** every user-bound source takes `active: inject(LOGGED_IN)`. Going inactive drops every entry, kept ones included, so logout needs no manual reset.

### 3.5 Data from `value$`, errors through the block

**Context:** templates read the stateful object itself with the `async` pipe.

**Problem:** the `async` pipe rethrows the object's error events, so a failed source threw in its template (the page tests failed with `HttpErrorResponse`).

**Steering:** templates read data from `x.value$` and leave errors to the block (`error$`).

### 3.6 One chain instead of an intermediate field

**Context:** the agent tended to write the projection into one field and derive the stream the view reads in another: `stream = inject(TOKEN).project(toObservable(id))`, then `slot = this.stream.pipeValue(...)`, with `stream` used nowhere else.

**Problem:** a field read only once adds a name and a hop for the reader without saying anything, and makes the component look like it has two sources.

**Steering:** write the chain in one field: `inject(TOKEN).project(toObservable(id)).pipeValue(...)`. A separate field is kept only when more than one derived stream, or the template, reads it.

### 3.7 Activity timer

**Context:** the activity poll was a `timer` inside the factory loader.

**Problem:** every customer kept in the cache kept being polled, not only the shown one (C15).

**Steering:** the poll is a timer in the activity section that reloads the entry it shows, so only the shown customer is polled, and only while shown (R-L8).

### 3.8 Activity after an error

**Context:** a failed poll must keep the list (R-G4).

**Problem:** the first fixes were a mute option on `reload()` and a stream operator that swallowed the error; both hide errors, against one of the library's intents: simple, visible error handling.

**Steering:**
- Errors are handled in the template: the block gets the error only while there is no list of the shown customer, so a failed poll keeps the list.
- The list carries its customer id, so a failed first load of the next customer shows its error instead of the previous customer's list (R-C2).

## 4. Check: an agent with the recipes

**Context:** after the contest, the section 3 rulings were written into the library's recipes (`docs/recipes.md` in the submodule, commit `8a14ab0`). The contest agent had deliberately not been given the recipes.

**Setup (November 2026):** one Sonnet subagent, one run, no steering. It was given the library's `readme.md`, `docs/recipes.md` and `docs/QoL.md`, the fake services of the kit, and a five-point task: login and logout that leave no user data behind; 8 customer rows with a tier each (`tiers` is a batch endpoint); select a customer, two tabs; the activity polled every 20 s, kept on screen when a poll fails; notes with an add form that refreshes them. It was told not to read the contest entries, `wip/` or `docs/contest`. Check: `tsc` only.

**Result:** every steering point of section 3 came out as the recipes show it, with no steering.

| Point | In the slice |
| --- | --- |
| 3.4 session invalidation | `active: inject(LOGGED_IN)` on every user-bound factory and on the write; no `reset(true)` (`so-data.ts`) |
| 3.1 entities in tokens | one `InjectionToken` per entity, no shared service (`so-data.ts`) |
| 3.3 UI state in components | selection and tab are signals of the workspace component, gone at logout (`so-workspace.component.ts`) |
| 3.6 one chain | `inject(TIER_BY_CUSTOMER).project(toObservable(id)).pipeValue(...)` (`so-tier.component.ts`) |
| 3.7 poll timer | a timer in the activity component reloads `get(id)` of the shown key (`so-activity.component.ts`) |
| 3.8 errors in the template | no `catchError`; the error is passed only while there is no list of the shown customer, tagged by the loader (`so-activity.component.ts`) |
| 3.5 data from `value$` | no `stream \| async` on a stateful object (all templates) |
| 3.2 batching | `statefulObservableBatchFactory` for `tiers` (`so-data.ts`) |
| write refresh | `notesOf.get(customerId).reload()` only (`so-notes.component.ts`) |

**Not counted:** how the login flag is produced (a `BehaviorSubject` flipped from the login and logout loaders): it depends on the app's auth mechanics, and the recipes leave it to the app. The add-note loader also clears the form text (minor).

**Limits:** the steering was about patterns, and so is the check: the slice was typechecked, not run, so request counts and polling were not observed. One run, on a slice smaller than the contest page.

**Artifact:** the slice is kept, unrouted, in `src/app/components/wip/so-slice/` (7 files, 305 lines).
