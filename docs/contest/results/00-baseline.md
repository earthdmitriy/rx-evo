# Baseline: what the four approaches share

Checked on 2026-11-19 against the code and the test reports of run
2026-11-19T08:58:44.143Z (seed 1).

Approaches, criteria short names (folders under
`src/app/components/contesters/`):

| Short name | Folder |
| --- | --- |
| vanilla | `vanilla-rxjs/` |
| ngrx-signal-store | `ngrx-signal-store/` |
| resources | `resources/` |
| stateful-observable | `stateful-observable/` |

`test-oracle` and `layout-draft` are not among the four and are not described
here.

An item is under **Shared** only if it is true for all four and no
`test_report.md` fails a scenario about it. Everything that fails is under
**Not shared**, with the criterion that owns it.

## Shared

- **Fake backend and API services.** `src/app/services/contesters/api/` (11
  services) and `src/app/services/contesters/backend/fake-backend.service.ts`.
  Imported through `services/contesters` by 6 files (vanilla), 14
  (ngrx-signal-store), 23 (resources), 10 (stateful-observable). Counted with
  grep over each folder.
- **Batch limit of the backend.** `src/app/services/contesters/console.types.ts:169`
  `export const MAX_BATCH = 20;`. The fake backend refuses more ids per batch
  call: `backend/fake-backend.service.ts:61`
  `if (unique.length > MAX_BATCH) throw badRequest(...)`. How each approach
  asks is criterion 04. ngrx-signal-store does not import `MAX_BATCH`.
- **Shared views.** `src/app/components/contesters/shared/` (14 `.ts` files:
  console frame, sign-in, console controls, customer list, customer header and
  tabs, rail, panels, notifications, agent). Imported by 20 files (vanilla), 21
  (ngrx-signal-store), 21 (resources), 18 (stateful-observable). Counted with
  grep on the import path.
- **Console frame and sign-in.** Used by every approach's console entry:
  `vanilla-rxjs/vanilla-rxjs-console.component.ts`,
  `ngrx-signal-store/signal-store-console.component.ts` and
  `stateful-observable/console-page.component.ts` import both;
  `resources/resources-console.component.ts` imports sign-in and
  `resources/resources-signed-in.component.ts` imports the frame.
- **View model and view state types.** `shared/view-models.ts` and
  `shared/view-state.ts`, read by the shared views, e.g.
  `shared/agent.component.ts:2` `import { AgentVm } from './view-models';` and
  `shared/customer-tabs.component.ts:4` `import { ACTION_IDLE, ActionState } from './view-state';`.
- **Field tokens.** `shared/fields.ts:122-133` declares 12 tokens
  (`PRODUCT_NAME_FIELD` ... `HIT_ADD_FIELD`). Each console entry provides all
  12 (12 `provide:` lines each): `vanilla-rxjs-console.component.ts:96-107`,
  `signal-store-console.component.ts:96-107`,
  `resources-console.component.ts:52-63`,
  `console-page.component.ts:147-158`.
- **Requirements and scenarios.** `docs/contest/stage-1.md`, `stage-2.md`,
  `stage-3.md` (R-ids and scenario groups A to H).
- **Routes.** One route per approach in `src/app/app.routes.ts`, each importing
  its console entry: vanilla line 629, ngrx-signal-store 650, resources 671,
  stateful-observable 692.

## Not shared: scenarios that fail

Pass/fail is from each approach's `test_report.md` (unit and e2e agree for
every row).

| Criterion | Scenario | Fails in | Requirement |
| --- | --- | --- | --- |
| 01 When a request starts | C9 | resources | R-L2, R-L8 |
| 02 Request reuse per key | C6 | resources | R-L3, R-L5 |
| 02 Request reuse per key | C7 | resources, ngrx-signal-store | R-L3 |
| 03 Cancelling | B1 | resources | R-C4 |
| 04 Batching | A2, B10, C7, C11, C12, D7 | ngrx-signal-store (all six), resources (all six) | R-L9, R-J3 |
| 05 Data during reload | B3 | resources | R-C3 |
| 07 Where state lives | A7 | resources | R-S4 |
| 08 Refresh after a write | C16 | resources | R-W10, R-L7 |
| none (no card lists it) | D9 | resources | stage 3, progressive cart line |
| none (no card lists it) | E7 | resources | R-G4 (stage 2) |

Sources: `resources/test_report.md`, `ngrx-signal-store/test_report.md`
(scenario ids), requirement ids from `docs/contest/stage-2.md` and
`stage-3.md` (for example `stage-3.md:139` for C16).

## Report status

| Approach | Unit failed | E2E failed | Failing scenarios |
| --- | --- | --- | --- |
| vanilla | 0 of 102 | 0 of 104 | none |
| ngrx-signal-store | 6 of 102 | 6 of 104 | A2, B10, C7, C11, C12, D7 |
| resources | 14 of 102 | 14 of 104 | A2, A7, B1, B3, B10, C6, C7, C9, C11, C12, C16, D7, D9, E7 |
| stateful-observable | 0 of 102 | 0 of 104 | none |

