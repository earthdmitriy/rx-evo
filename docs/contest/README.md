# Contest: one console, many data layers

The `contesters` group implements **one busy internal page**, a shop's
support console, with several data-layer approaches (vanilla RxJS,
statefulObservable, signals + resources, a store, a query cache, …). Each
approach is built in **three stages** that follow how a real page grows:
baseline, robust, efficient. All stages stay in the repo and can be switched
on the page.

The comparison is between the **best possible implementation** of each
approach at each stage, not between agents or authors. It measures what a
stage costs to write, what growing to the next stage costs, and what each
approach gives **for free**.

Status: **kit ready**. The fake backend (split into id-only services), the
shared views (fixed view models), the harness, the page tests, the e2e suite
and the reference implementation exist; the approaches do not yet.

## Files

| File | For | Contents |
| --- | --- | --- |
| [methodology.md](methodology.md) | evaluator | What is measured and how: stages, "for free", costs, tradeoffs, isolation, protocol, report. |
| [spec.md](spec.md) | implementer | The page, the provided kit, the backend, the view contract, rules, definition of done. Stage-independent. |
| [stage-1.md](stage-1.md) | implementer of stage ≥ 1 | Baseline requirements and scenarios. |
| [stage-2.md](stage-2.md) | implementer of stage ≥ 2 | Robust: degradation, recovery, reloads, write precision. |
| [stage-3.md](stage-3.md) | implementer of stage 3 | Efficient: laziness, cache, progressive loading. |
| [dataflow.md](dataflow.md) | evaluator | Reference dataflow of the full page. Never given to implementers (it shows stage 3). |

An implementer of stage *n* gets `spec.md` and `stage-1.md` … `stage-n.md`,
nothing else from this folder.

## Approaches

| Route | Data layer | Notes |
| --- | --- | --- |
| `vanilla-rxjs` | RxJS only | Also the "no library" baseline: RxJS ships with Angular. |
| `stateful-observable` | statefulObservable | The library of the `wip` / `xprerimental` samples. |
| `resources` | Signals + `resource` / `rxResource` / `httpResource` | Framework-native. |
| `signal-store` | NgRx SignalStore | Core only, or with the community toolkit: decide before the round. |
| `tanstack-query` | TanStack Query Angular | Experimental package; pin the version. |

## Layout in the repo

```
src/app/components/contesters/
  shared/                       views shared by every approach
  layout-draft/                 static layout (temporary)
  <approach>/
    stage-1/  stage-2/  stage-3/   self-contained; no imports between stages
src/app/services/contesters/    fake backend (done)
docs/contest/                   this folder
e2e/                            browser suite, report
.../contesters/page-tests/      the same scenarios as Vitest page tests
```

- Route per stage: `/contesters/<approach>/stage-<n>`.
- The shell shows a **stage switch** (1 · 2 · 3) for `dashboard` samples and,
  under the demo, the selected stage's README and costs.
- Stage *n+1* starts as a copy of stage *n*, made by the evaluator, so the
  diff between the folders is the cost of growing.

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
   / free / not yet). Validated against the **reference** (below).
6. ✅ **Metric scripts** `tools/contest/metrics.mjs` (methodology §4.1–4.2)
   and **audit** `tools/contest/audit.mjs` (§6.3). Plumbing share and
   cognitive complexity still need the review checklist and ESLint sonarjs.
7. **Pre-registration** (methodology §8), then the approaches, stage by
   stage.

## Reference implementation (test oracle)

`src/app/components/contesters/reference/` meets every stage. It exists to
validate the suite, is **not a contest entry**, and is **never** part of a
contest base or shown to implementers. Plain RxJS over a keyed-query cache,
with defect switches (`?defect=no-cache`, `stage-1`, … see its
`data/defects.ts`):

```bash
npm run e2e:validate
npm run pages:validate
```

run the suites on the reference with no defect (everything must pass) and
with each defect (its targeted scenarios must fail, the baseline must not).

## Commands

```bash
E2E_CONTESTER=reference npm run e2e
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
folder and its route. Left out: the reference, the page tests, other
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
- Switching customer never shows the previous customer's data; a reload of
  the same key keeps it dimmed. Stricter than criterion 2 of
  `sample-description.md` on purpose: an agent acts on what is shown.
- The backend is split into services that return ids only (no BFF): names,
  tiers, counters, prices and stock come from other services, in batches of
  at most 20, and the page joins them. The shared views take fixed view
  models (`Part<T>` per field that comes from another service).
- Products, prices and stock are public: kept across sessions.
- Tab counters and KPIs come from `orderStats` and `ticketCounts`, so tabs
  can stay lazy.
- Optimistic display is optional for every write.
- Best possible implementations, three stages each, all tests at every
  stage; agent effort is not part of the result.

## Open questions

- Should the order editor block Save while `products`, `prices` or `stock` are unavailable, or only
  the search (current spec: only the search, stage 2)?
- `markNotificationsRead`: optimistic badge reset or wait for the server?
- Cache lifetime: stage 3 keeps every loaded key for the whole session. Is a
  bound (e.g. the last N customers) worth a scenario?
- Push (`push$`): requirements still poll `notifications`. Should push
  replace the poll and invalidate what it is about? Candidate for a later
  change request rather than a stage.
