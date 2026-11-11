# 01 · When a request starts

Why: a request that starts without a visible consumer is wasted load (R-L2,
R-L1, R-L8). Scenarios: A1, A6, C9, and the stage-3 laziness scenarios whose
expectations are the R-L2 items (C1, C7, C8). Reports: run 2026-11-19.
Paths are relative to `src/app/components/contesters/`.

## Per approach

### 01 · vanilla
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Trigger | `subscribe` | `vanilla-rxjs/data/query.ts:100` "return defer(() => {" |
| Q2 What stops a request when nothing shows the data | `no subscriber` | `vanilla-rxjs/data/query.ts:102` "entry.attach();" (the request is started by `attach` inside `defer`, so no subscriber means no call) |
| Q3 Sources that start with no visible consumer | `none` | `vanilla-rxjs/vanilla-rxjs-console.component.ts:63` "@if (!signedIn()) {"; `vanilla-rxjs/data/console.store.ts:143` "typed.pipe(debounceTime(300)).subscribe(" (user input only, no request) |
| Q4 Polls stop when the view goes | `yes` | `vanilla-rxjs/data/query.ts:63` "this.poll = interval(this.opts.pollMs)"; stop at `query.ts:68-69` "if (this.observers > 0) return;" then "this.poll?.unsubscribe();" |
| Mechanism | `helper (16)` | `vanilla-rxjs/data/query.ts:59-76` (`attach` and `detach`; `defer` and `finalize` are RxJS) |
| Failing scenarios (from report) | none | `vanilla-rxjs/test_report.md` (unit 0 of 102, e2e 0 of 104) |

Notes: A1, A6, C1, C7, C8, C9 are not failing in the report. Poll sources are `vanilla-rxjs/data/sources.ts:68` "pollMs: 30_000," (notifications) and `:78` "pollMs: 20_000," (activity); both start on the first observer.

### 01 · ngrx-signal-store
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Trigger | `component creation` | `ngrx-signal-store/data/entity-store.ts:133` "effect(" (the attach runs inside an effect created with the component) |
| Q2 What stops a request when nothing shows the data | `params undefined` (null id: order editor, order panel); `template @if` (customer sections) | `ngrx-signal-store/data/entity-store.ts:149` "if (current === null) return;"; `ngrx-signal-store/signal-store-console.component.ts:72` "@if (ui.selected(); as customerId) {" |
| Q3 Sources that start with no visible consumer | `none` | `ngrx-signal-store/signal-store-console.component.ts:67` "<app-signal-store-notifications-section consoleBell />" (shown whenever signed in, `:63`); customer-scoped sections are under `:72`, `:79`, `:86` |
| Q4 Polls stop when the view goes | `yes` | `ngrx-signal-store/components/customers/customer-detail/rail/activity/activity-section.component.ts:51` "poll(this.cache, this.customerId, 20_000);"; `ngrx-signal-store/data/entity-store.ts:171` "takeUntilDestroyed(destroyRef)," |
| Mechanism | `helper (11)` | `ngrx-signal-store/data/entity-store.ts:127-142` (`cacheEntry`) |
| Failing scenarios (from report) | C7 | `ngrx-signal-store/test_report.md` (unit and e2e) |

Notes: C7 fails at `page-tests/c-cache.spec.ts:98` (prices 4, expected 1), after the "nothing until typed" check at `:94` passed. The fail is the batch count after typing (criterion 04). A1, A6, C1, C8, C9 are not failing.

### 01 · resources
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Trigger | `first read` (registry entries); `component creation` (component-owned `rxResource`) | `resources/data/activity.registry.ts:26` "activity(id: number) {"; `resources/components/agent/agent-section.component.ts:31` "protected readonly profile = rxResource({" |
| Q2 What stops a request when nothing shows the data | `params undefined` (component-owned); `template @if` (registry readers) | `resources/components/panels/order-panel/order-panel-section.component.ts:66` "params: () => this.orderId(),"; `resources/resources-signed-in.component.ts:68` "@if (ui.selected(); as customerId) {" |
| Q3 Sources that start with no visible consumer | `none` | `resources/resources-signed-in.component.ts:63` "<app-resources-notifications-section consoleBell />" (the notifications `rxResource` at `resources/components/notifications/notifications-section.component.ts:36` is read by the bell) |
| Q4 Polls stop when the view goes | `yes` | `resources/components/notifications/notifications-section.component.ts:48-49` "interval(30_000)" with ".pipe(takeUntilDestroyed())"; `resources/components/customers/customer-detail/rail/activity/activity-section.component.ts:44-45` "interval(20_000)" with ".pipe(takeUntilDestroyed())" |
| Mechanism | `built in` (rxResource `params`) | `resources/components/panels/order-panel/order-panel-section.component.ts:65-68` |
| Failing scenarios (from report) | C7, C9 | `resources/test_report.md` (unit and e2e) |

Notes: The registry read is `helper (8)` at `resources/data/activity.registry.ts:26-33`. C7 fails at `page-tests/c-cache.spec.ts:98` as in ngrx-signal-store (`:94` passed). C9 fails at `:121` on notifications (1, expected 2); activity and orderStats are 0 as expected.

### 01 · stateful-observable
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 Trigger | `subscribe` | `stateful-observable/components/notifications/notifications-section.component.ts:27` "notifications.value$ | async" |
| Q2 What stops a request when nothing shows the data | `no subscriber` (and `template @if` for customer sections) | `stateful-observable/console-page.component.ts:79` "@if (loggedIn()) {"; `stateful-observable/console-page.component.ts:93` "@if (customer !== null) {" |
| Q3 Sources that start with no visible consumer | `none` | `stateful-observable/console-page.component.ts:84` "<app-notifications-section consoleBell />" (inside the `loggedIn()` gate at `:79`); sources start on subscription |
| Q4 Polls stop when the view goes | `yes` | `stateful-observable/components/customers/customer-detail/rail/activity/activity-section.component.ts:59` "switchMap((id) => timer(POLL_MS, POLL_MS).pipe(map(() => id)))," with `:60` "takeUntilDestroyed()," ; notifications: `stateful-observable/components/notifications/notifications-section.component.ts:44` "timer(0, 30_000).pipe(" with default refCount, `src/app/submodules/stateful-observable/src/factory.ts:143` "const refCount = params.refCount ?? true;" |
| Mechanism | `built in` | `src/app/submodules/stateful-observable/src/factory.ts:143` (the subscription drives the load and its end) |
| Failing scenarios (from report) | none | `stateful-observable/test_report.md` (unit 0 of 102, e2e 0 of 104) |

Notes: The activity poll lives in the section (`activity-section.component.ts:57-62`, comment at `:55-56`), not in the lookup. `ACTIVITY_BY_CUSTOMER` (`stateful-observable/sources/lookups.ts:122-129`) sets no `refCount`. C9 selects no customer, so deselecting while the poll runs is not covered by any scenario.

## Side by side

| Approach | Q1 Trigger | Q2 Stops when nothing shows the data | Q3 Sources with no consumer | Q4 Polls stop | Failing |
| --- | --- | --- | --- | --- | --- |
| vanilla | `subscribe` | `no subscriber` | none | yes | none |
| ngrx-signal-store | `component creation` | `params undefined` (null id); `template @if` | none | yes | C7 |
| resources | `first read` (registry); `component creation` (component-owned) | `params undefined`; `template @if` | none | yes | C7, C9 |
| stateful-observable | `subscribe` | `no subscriber`; `template @if` | none | yes | none |

## Verdict

- vanilla and stateful-observable start a request on subscription (Q1 `subscribe`: `vanilla-rxjs/data/query.ts:100` "return defer(() => {", `stateful-observable/components/notifications/notifications-section.component.ts:27` "notifications.value$ | async").
- ngrx-signal-store starts each attach from an effect created with its component (Q1 `component creation`: `ngrx-signal-store/data/entity-store.ts:133` "effect("), and does nothing while the id is `null` (Q2 `params undefined`: `ngrx-signal-store/data/entity-store.ts:149` "if (current === null) return;").
- resources starts registry entries on first read (Q1 `first read`: `resources/data/activity.registry.ts:26` "activity(id: number) {") and component-owned rxResources at creation, held idle by `params` (Q2 `params undefined`: `resources/components/panels/order-panel/order-panel-section.component.ts:66` "params: () => this.orderId(),").
- All four: Q3 is `none`, every source sits behind the signed-in gate or a customer `@if`, and the bell is shown whenever signed in (for example `ngrx-signal-store/signal-store-console.component.ts:67`, `stateful-observable/console-page.component.ts:84`). In the report, C7 fails for ngrx-signal-store and resources at `c-cache.spec.ts:98` on the prices count after typing, and C9 fails for resources at `:121` on the notifications count; neither failure is a request with no consumer.
- Q4 is `yes` for all four: each poll is cleared when its observer or section goes (for example `vanilla-rxjs/data/query.ts:69`, `ngrx-signal-store/data/entity-store.ts:171`, `resources/components/customers/customer-detail/rail/activity/activity-section.component.ts:45`, `stateful-observable/components/customers/customer-detail/rail/activity/activity-section.component.ts:60`).
