# Contest: one console, many data layers

The `contesters` group implements **one busy internal page**, a shop's
support console, with several data-layer approaches (vanilla RxJS,
statefulObservable, signals + resources, a store, …). The stage machinery
(`stage-1.md`/`stage-2.md`/`stage-3.md`, the three-stage folder layout, the
stage switch in the shell) still exists and stays usable, but **three full
stages for every approach cost too much to keep requiring**: an approach is
now a single implementation, scored against the stages it happens to meet,
not a three-round build-up every approach must complete (see "Decisions").

The comparison is between the **best possible implementation** of each
approach, not between agents or authors. It measures what each approach
gives **for free** and what it costs to get the rest.

Status: **kit ready, all five entries in place**. The fake backend (split
into id-only services), the shared views (fixed view models), the harness,
the page tests, the e2e suite and the test oracle exist. One is not a
contest entry (`test-oracle`, the suite's own oracle); four are contest
entries (`vanilla-rxjs`, `resources`, `signal-store`, `stateful-observable`);
see "Approaches".

## Files

| File | For | Contents |
| --- | --- | --- |
| [methodology.md](methodology.md) | evaluator | What is measured and how: stages, "for free", costs, tradeoffs, isolation, protocol, report. |
| [spec.md](spec.md) | implementer | The page, the provided kit, the backend, the view contract, rules, definition of done. Stage-independent. |
| [stage-1.md](stage-1.md) | implementer of stage ≥ 1 | Baseline requirements and scenarios. |
| [stage-2.md](stage-2.md) | implementer of stage ≥ 2 | Robust: degradation, recovery, reloads, write precision. |
| [stage-3.md](stage-3.md) | implementer of stage 3 | Efficient: laziness, cache, progressive loading. |
| [dataflow.md](dataflow.md) | evaluator | Dataflow of the full page (the test oracle). Never given to implementers (it shows stage 3). |

An implementer of stage *n* gets `spec.md` and `stage-1.md` … `stage-n.md`,
nothing else from this folder.

## Approaches

Five entries, all in place:

| Route | Data layer | Status |
| --- | --- | --- |
| `test-oracle` | plain RxJS over a keyed-query cache | Not a contest entry (see "The test oracle"). |
| `stateful-observable` | statefulObservable | Contest entry, written by an agent and steered by hand by the library's maintainer ([steering.md](steering.md)). Passes every page-test and e2e scenario of stages 1-3. |
| `vanilla-rxjs` | RxJS only, no library | Contest entry. Built from `test-oracle`'s own code, its defect-switch scaffolding stripped out — `test-oracle` already was "no library, done well". Passes every page-test scenario; the latest e2e run fails B10 once (see its README). |
| `resources` | Signals + `resource()` / `rxResource()` | Contest entry, written by an agent and steered by hand by the maintainer, built from Angular's own primitives throughout (`signal`, `computed`, `rxResource`) — no NgRx, no borrowed RxJS classes. Every section fetches its own data with no shared cache (`resource()` has none); a version `Bus` of plain signals stands in for cache invalidation after a write. Judged by both suites: the page tests run it under the async harness (`page-tests/console-page.harness.ts`), the browser suite too. The failing scenarios and their causes are in its `gaps.md` |
| `signal-store` | NgRx SignalStore (core) | Contest entry, built from NgRx SignalStore's own primitives throughout (`withEntities` keyed caches with `attach`/`detach` reference-counting, not another approach's RxJS classes). Passes both suites; the only gap is the batch endpoints (`tiers`, `ticketCounts`, `prices`), read one id per call. |

Every entry was written by an agent. `stateful-observable` and `resources` were also steered by hand; `vanilla-rxjs` and `signal-store` were not.

`tanstack-query` is off the roster for now (it was never started).

## Layout in the repo

```
src/app/components/contesters/
  shared/                       views shared by every approach
  layout-draft/                 static layout (temporary)
  <approach>/                   self-contained; no imports between approaches
  test-oracle/                  the oracle: a shell plus section components, children in subfolders
src/app/services/contesters/    fake backend (done)
docs/contest/                   this folder
e2e/                            browser suite, report
.../contesters/page-tests/      the same scenarios as Vitest page tests
```

- **Every accepted implementation lives in this repo**, under
  `contesters/<approach>/`, so they can be run and compared side by side
  (see "Implementations in the repo" below).
- Route: `/contesters/<approach>`.
- The `stage-<n>` folder layout and the shell's stage switch (1 · 2 · 3) are
  left over from the earlier three-stage-per-approach model: still usable by
  a sample that wants it (e.g. the playground's own `stage-1/stage-2`
  dashboards elsewhere in the app), but none of the five contest entries
  uses it any more — each is one flat folder, like `test-oracle` above.

## Prompt for one stage

The implementer works in a fresh clone of the contest base for that stage
(methodology §6.2). In that clone:

```
read docs/contest/spec.md and docs/contest/stage-1.md … stage-<STAGE>.md
and implement stage <STAGE> of the page

approach: <ROUTE>
use <TOOL> to handle dataflow

you can explore only folders
docs/contest
src/app/components/contesters/shared
src/app/components/contesters/<ROUTE>
src/app/services/contesters
src/app/components/content
src/app/app.routes.ts
src/app/samples
src/styles.css
docs-vendor/<TOOL>
e2e/smoke

forbidden to change:
docs
src/app/components/contesters/shared
src/app/components/contesters/<ROUTE>/stage-<STAGE - 1>
src/app/services
src/app/components/content
src/styles.css
e2e
```

## Shared work, in order

1. ✅ **Fake backend** (`src/app/services/contesters/`, see its README): one
   service per domain, seeded data, writes that change the backend state,
   401 while signed out, a hot `push$` of notifications.
2. ✅ **Harness:** `?seed`, `?latency=fast|slow|manual`, `?push=off`,
   `window.__api` (`src/app/services/contesters/harness/test-hook.ts`:
   `pending`, `release`, `releaseAll`, `fail`, `setThrow`, `setLatency`,
   `stats`, `resetStats`, `push`, `fixtures`), and the request panel
   (`app-console-controls`) the shell shows for `dashboard` samples.
3. ✅ **Shared views** (`src/app/components/contesters/shared/`, see its
   README): console frame, sign-in screen, one presentational component per
   section, `app-state-view` over `ViewState`.
4. ✅ **Shell:** stage routes are plain samples whose folder ends in
   `stage-<n>`; the shell shows a stage switch for them and the stage's README
   under the demo. (Per-stage cost numbers on the page: later.)
5. ✅ **Page tests** (`src/app/components/contesters/page-tests/`): 131 of the
   scenarios as Vitest tests (TestBed + fake backend, synchronous,
   ~30× faster than the browser), same ids and stages. **E2E suite** (`e2e/`): every scenario of the stage files as one test
   per scenario and stage (`@s1` / `@s2` / `@s3`), `@smoke` subset, targets
   in `e2e/targets.ts`, report `e2e/report/contest-report.md` (met / missing
   / free / not yet). Validated against the **test oracle** (below).
6. ✅ **Metric scripts** `tools/contest/metrics.mjs` (methodology §4.1–4.2)
   and **audit** `tools/contest/audit.mjs` (§6.3). Plumbing share and
   cognitive complexity still need the review checklist and ESLint sonarjs.
7. **Pre-registration** (methodology §8), then the approaches, stage by
   stage.

## The test oracle

`src/app/components/contesters/test-oracle/` meets every stage. It exists to
validate the suite, is **not a contest entry**, and is **never** part of a
contest base or shown to implementers. Plain RxJS over a keyed-query cache,
with defect switches (`?defect=no-cache`, `stage-1`, … see its
`data/defects.ts`):

```bash
npm run e2e:validate
npm run pages:validate
```

run the suites on the test oracle with no defect (everything must pass) and
with each defect (its targeted scenarios must fail, the baseline must not).

## Implementations in the repo

Each of the five entries is one flat folder, connected in three places:

| Where | What |
| --- | --- |
| `src/app/components/contesters/<approach>/` | the folder (code and `README.md`) |
| `src/app/app.routes.ts` | a `sampleRoute('<approach>', …)` entry in the `contesters` group, with the metadata (title, summary, verdict, tags) |
| `e2e/targets.ts` | the approach in `IMPLEMENTED`, so the browser suite can run it |
| `src/app/components/contesters/page-tests/pages.ts` | the root component in the registry, so the page tests can run it — skipped for an approach the page tests cannot judge (see "Limit of the page tests") |

Nothing else in the repo changes: the shared views, the fake backend and the
suites are common to every approach, and an implementation never edits them.

`tools/contest/make-base.mjs`/`evaluate.mjs` (the contest-base / evaluator
pipeline for an external implementer working stage by stage in a separate
repository) still exist but are not how these five were built: each was
written directly in this repo, in one pass, against the full requirement
set.

Run the suites against any implementation in the repo:

```bash
E2E_CONTESTER=<approach> npm run e2e
```

```bash
PAGE_TARGET=<approach> npm test
```

**Limit of the page tests.** They run under `fakeAsync`. Angular's `resource()`/`rxResource()` settle through native `async`/`await`, which `fakeAsync` cannot flush, so the page tests drive them through the async harness (`page-tests/console-page.harness.ts`: every step awaits the page and advances fake timers). An approach judged this way needs the harness, not a change to its code. `signal-store` is judged by both suites, and so is `resources`.

The second runs every page test of every stage against that page: a stage-1
page passes the stage-1 scenarios and shows what it gets for free of the
later ones (all other scenarios fail, "not yet"). `evaluate.mjs` does the
same on a submission before it is copied here, and writes the report.

## Commands

```bash
E2E_CONTESTER=test-oracle npm run e2e
```

```bash
E2E_CONTESTER=<approach> E2E_STAGE=<n> npm run e2e:smoke
```

```bash
node tools/contest/metrics.mjs src/app/components/contesters/<approach>/stage-1 src/app/components/contesters/<approach>/stage-2
```

```bash
node tools/contest/audit.mjs <approach> <stage> <contest-base-ref>
```

Running a round (methodology §6.2):

```bash
node tools/contest/make-base.mjs <approach> <stage> --tool "<TOOL>" --out <dir> [--prev <stage n-1 folder>] [--docs <tool docs>] [--verify]
```

builds the **contest base**: a fresh one-commit repo with the shell, shared
views, fake backend, harness, `spec.md` and the stage files up to `<stage>`,
the **smoke scenarios of stages ≤ `<stage>`** (source and run), a stub stage
folder and its route. Left out: the test oracle, the page tests, other
approaches and samples, evaluator docs and tools, later stages. It writes
the implementer's prompt to `<dir>.prompt.txt`.

```bash
node tools/contest/evaluate.mjs <approach> <stage> --sub <implementer repo> [--out <dir>]
```

audits the submission, puts the evaluator's shared views, backend, harness
and whole suite back over a copy of it, builds it, runs **every e2e scenario
and every page test of every stage**, and writes `evaluation.md` (met /
missing / free / not yet per layer) with the logs.

## Decisions

- One role (support agent). Other back-office sections are locked stubs
  owned by other departments; agents answer tickets but do not open them,
  and change orders only before shipping, for a ticket.
- Once a block stops loading after switching customer, it shows only the
  current customer's data (the previous one may stay under the spinner while
  it loads); a reload of the same key keeps its data dimmed. An agent acts on
  what is shown.
- The backend is split into services that return ids only (no BFF): names,
  tiers, counters, prices, stock and agent names come from other services
  (`tiers`, `ticketCounts` and `prices` in batches of at most 20; `product`,
  `stock` and `agent` one id per call), and the page hands each piece to the view as its own input
  (the shared views take fixed view models, data only, plus a `Lookup` by id
  per other service; a key that has not arrived is an empty space).
- Products, prices and stock are public: kept across sessions.
- Tab counters and KPIs come from `orderStats` and `ticketCounts`, so tabs
  can stay lazy.
- Optimistic display is optional for every write.
- Best possible implementations; agent effort is not part of the result.
- **Three full stages for every approach cost too much.** The roster is five
  entries (see "Approaches"): `test-oracle` was already built this way and
  stays as it is; the four contest entries (`vanilla-rxjs`, `resources`,
  `signal-store`, `stateful-observable`) are a single implementation
  each, scored against whichever stages it meets, not a required three-round
  build-up. `tanstack-query` is dropped from the roster.

## Open questions

- Should the order editor block Save while `product`, `prices` or `stock` are unavailable, or only
  the search (current spec: only the search, stage 2)?
- `markNotificationsRead`: optimistic badge reset or wait for the server?
- Cache lifetime: stage 3 keeps every loaded key for the whole session. Is a
  bound (e.g. the last N customers) worth a scenario?
- Push (`push$`): requirements still poll `notifications`. Should push
  replace the poll and invalidate what it is about? Candidate for a later
  change request rather than a stage.
