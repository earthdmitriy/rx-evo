# Contest methodology

How the approaches are compared. Read with [README.md](README.md) (setup) and
[spec.md](spec.md) + stage files (what is built).

Status: **proposal**. Settle the open points (§9), then freeze this file with
the spec, the stage files and the suite (§8).

## 1. The question

*For this kind of page, what does each data-layer approach cost at the start,
what does it cost to grow, and what does it give for free?*

The subject is the **approach**, not the person or agent who wrote the code.
So every approach is represented by its **best possible implementation** at
each stage: idiomatic, reviewed, improved until nobody can make it cheaper
without breaking a requirement. Who or what writes it (a person, an agent,
both) is not measured.

## 2. Stages

A page is not written complete. It starts simple, then incidents and
performance complaints add requirements, and code is restructured on the
way. The contest models this with three stages per approach:

| Stage | Name | Adds | Typical trigger |
| --- | --- | --- | --- |
| 1 | **Baseline** | A first shippable page: correct data, session and customer isolation, latest input wins, polls, writes with visible results, errors visible, recovery by a new input. | Feature delivery. |
| 2 | **Robust** | Failures isolated per section and row, failed sources named, Retry refetches only what failed, polled data kept on error, same-key reloads keep content, superseded requests cancelled, exact refresh after writes, writes survive navigation, input kept on failure. | Production incidents. |
| 3 | **Efficient** | Requests only for what is visible, one request per key, cache and hold state, debounce, progressive loading, no waterfalls, polls only while needed. | Performance complaints. |

Requirements and scenarios per stage: [stage-1.md](stage-1.md),
[stage-2.md](stage-2.md), [stage-3.md](stage-3.md).

Rules:

- **No foresight.** The implementer of stage *n* gets only the stage files
  1…*n*. Stage 1 is the best version for stage 1's requirements, not a
  version prepared for stage 3. Reviewers reject structure that serves only
  later stages.
- **Growth from the previous stage.** Stage *n+1* starts as an exact copy of
  stage *n* (made by the evaluator) and is changed from there. The diff
  between the two folders is the cost of growing, refactoring included.
- **Self-contained stages.** No imports between stage folders, or between
  approaches. Generic helpers live inside the stage and count as its code.
- **No regressions.** Stage *n* meets every requirement of stages 1…*n*.

## 3. Testing: everything, at every stage

The suite covers all three stages, in two layers: **page tests** (Vitest + TestBed, the page mounted against the fake backend, `src/app/components/contesters/page-tests/`) for every scenario that needs no real browser, and **e2e** (Playwright) for the rest (route, history, real timing). Both use the same scenario ids and stage tags. **Every stage of every approach runs
the whole suite.** Each assertion is tagged with the stage that introduces it
(`stage:1|2|3`), and the report sorts the results of a run of stage *n* into:

| Assertion stage | Passes | Fails |
| --- | --- | --- |
| ≤ *n* (required) | ✅ met | ❌ **missing**: a defect of that stage |
| > *n* (ahead) | 🎁 **free**: the approach gave it without being asked | · not yet: expected |

**Free** is the point of the method. It shows what the approach's defaults
already do: a library that cancels superseded requests, keeps stale data on
reload or caches by key gets stage 2–3 assertions green at stage 1, with no
code aimed at them. No foresight (§2) is what makes "free" honest: the
implementer did not know the requirement existed.

Per approach the report then shows, for stage 2 and 3 requirements:

- **free at stage 1** (and, for stage 3, free at stage 2);
- **cost when requested**: the diff that turned the remaining assertions
  green;
- **free share**: free assertions ÷ all assertions of that stage.

A "free" result can also be negative: an assertion that passes at stage 1
and fails at stage 2 is a regression caused by growing, and is reported as
such.

Where one scenario checks things of several stages (e.g. A1: "only the
sign-in screen" is stage 1, "no requests" is stage 3), it is split into
assertions with different tags. The stage files list each scenario's
expectations per stage.

## 4. What is measured

### 4.1 Code, per stage (data layer only)

By script, on code formatted with the project's Prettier, comments and blank
lines excluded, views and README excluded:

| Measure | Meaning |
| --- | --- |
| **Lines** | Size of the data layer. Stage 1 lines = **entry cost**. |
| **Plumbing lines** and **plumbing share** | Lines that are not about the page's domain: status handling, keys and caches, cancellation, subscription and lifetime management, mapping to `ViewState`, generic helpers. Tagged by review with a checklist (§4.5); the share shows whether boilerplate grows faster than the page. |
| **Template wiring lines** | State handling in the page templates (status branches, async pipes, status reads). |
| **Concepts** | Distinct APIs and abstractions a reader must know to follow the data layer (tool APIs plus RxJS/Angular APIs used for data). |
| **Cognitive complexity** | Sum and maximum per function (ESLint `sonarjs/cognitive-complexity`). |
| **State spread** | Places that hold state; places that know about the session or the selected customer. |
| **Imperative writers** | `next`, `set`, `update`, `patchState`, manual `subscribe` outside source definitions. |
| **DIY helpers** | Lines of generic helpers written because the tool lacks them. |

### 4.2 Growth, between stages

From `git diff --no-index` between stage folders (whitespace ignored, renames
followed):

| Measure | Meaning |
| --- | --- |
| Lines added / removed / changed | Raw cost of growing. |
| **Rewrite ratio** | Lines of stage *n* changed or removed ÷ lines of stage *n*. How much restructuring the new requirements forced. |
| Files touched; abstractions added, replaced, removed | Structural change (from review notes). |
| Plumbing growth | Plumbing lines added vs domain lines added. |

### 4.3 How each requirement is met

For every requirement of stages 2 and 3, one row per approach:

| Mechanism | Meaning |
| --- | --- |
| 🎁 free | Passed before it was required (§3). |
| built in | A tool feature used as designed, no configuration beyond picking it. |
| configuration | An option or setting of the tool. |
| helper (*n* lines) | Generic code written inside the stage. |
| workaround (*n* lines) | Code that works against or around the tool, with a note why. |
| not met | With the reason, challenged (§6.4). |

This table is the **price list**: what each requirement costs with each
approach.

### 4.4 Runtime

From the suite run, per stage:

- total requests over the whole suite;
- **leaks**: after sign-out and leaving the page, `inFlight` is 0 for every
  key and advancing the clock 2 minutes causes no request;
- bundle: gzipped size of the stage's lazy chunks plus new vendor code,
  against an empty page with the same views.

### 4.5 Tradeoffs and review

Each approach gets a review per stage by someone who did not write it,
ideally a user or maintainer of the tool, with a fixed checklist:

- Is it idiomatic per the tool's docs? What would its maintainers change?
- Which lines are plumbing (for §4.1)?
- Which requirements needed workarounds, and why?
- Readability: can the dataflow be followed from the code?

**Tradeoffs** are written as claims with evidence (a link to code, a test, a
number): what the approach makes easy, what it makes awkward, debugging and
devtools, testability, type safety, lock-in, maturity. They are reported as
text, never scored.

### 4.6 What is not measured

- The effort of producing an implementation (time, tokens, iterations).
  Optionally reported in an appendix for agent-written runs, clearly apart
  (it mostly measures how well a model knows the tool).
- A single overall score. If an ordering is needed, it is per measure.

## 5. Report

One page per round, generated from data:

1. Setup: tool versions, spec and suite tag, who implemented and reviewed.
2. **Matrix** approach × stage: required met / missing, free, not yet.
3. **Free table**: stage 2 and 3 requirements × approach, free at which
   stage.
4. **Price list** (§4.3).
5. **Growth chart** per approach: lines, plumbing share and complexity over
   stages 1–3; rewrite ratio for 1→2 and 2→3.
6. Code and runtime tables (§4.1, §4.4).
7. Tradeoffs and reviews.
8. Raw data: e2e reports, diffs, audit logs.

On the page, the stage switch shows the selected stage's README and its
numbers under the demo.

## 6. Producing the implementations

### 6.1 Best possible

- Any author or tool may write the code; the result is what counts.
- **Review per stage** (§4.5) before the numbers are taken.
- **Improvement window:** after the first results, anyone may propose a
  change to any stage of any approach. It is accepted if all required
  assertions still pass, it stays idiomatic per the tool's docs and
  reviewer, it respects no-foresight (no code for later stages), and it
  lowers a measured cost (§4.1) without raising another one disproportionately.
- **Same documentation for all:** each tool's official docs at the pinned
  version. statefulObservable's docs are taken from a tag that predates the
  spec, without the comparison article, test suite or samples.

### 6.2 Isolation

Instructions limit what an implementer reads; isolation makes copying
impossible:

- A **contest base** per stage: a tagged commit with the app shell, shared
  views, fake backend, harness, smoke tests, `docs/contest/spec.md` and the
  stage files up to that stage, and the approach's own previous stage. No
  other approaches, no statefulObservable samples (`wip/`, `xprerimental/`),
  no reference implementation (`contesters/reference/`), no evaluator docs
  (`methodology.md`, `dataflow.md`, `README.md`), no full suite, no
  `tools/contest/`.
- A **fresh single-branch clone** per stage and approach, not a worktree
  (a worktree shares `.git` and every other branch).
- The statefulObservable submodule only for that approach; others use
  published packages.
- Network limited to the npm registry; docs come as a local snapshot
  (`docs-vendor/<tool>/`).
- Implementations are not published until the round is complete.

### 6.3 Audit

Automated, on every submitted stage; any hit rejects the submission:

- Changed files only in `contesters/<approach>/stage-<n>/`, the route entry,
  and `package.json` / lock file for the declared tool.
- No reference to the harness or server side (`__api`, `FakeTransport`,
  `FakeBackend`, `backend/`, `latency`, `seed`, `navigator.webdriver`), no
  test ids used in TypeScript logic, no constant timeouts used to wait for
  data, no DOM polling.
- No imports from another stage or approach.
- No code for requirements of later stages (review, §2).

### 6.4 Claimed limitations

An implementation may state that the tool cannot meet a requirement. The
claim goes to a reviewer who knows the tool, with one attempt to meet it
idiomatically. If it succeeds, the change is merged (improvement window) and
the claim is dropped. Only unrefuted claims are published as tool limits.

## 7. Later rounds: change requests

Once all approaches have stage 3, the same mechanism measures further
growth with change requests, unknown to implementers until then, e.g.:

- **CR1:** notifications move from polling to `push$`; a push about the
  open ticket or order refreshes it.
- **CR2:** a new tab (returns) with its own source, cache and errors.
- **CR3:** the customer list becomes infinite scroll.

Each is a stage-like step: requirements file, copy of stage 3, all tests,
diff, free / cost.

## 8. Pre-registration

Freeze in one tagged commit before the first implementation:

- [ ] `spec.md` and the stage files reviewed for tool-shaped wording, by at
      least one user of a tool other than statefulObservable.
- [ ] Every assertion of the suite tagged with its stage.
- [ ] Smoke subsets per stage chosen; the full suite kept out of the contest
      bases.
- [ ] Metric scripts (§4.1, §4.2, §4.4) and the audit (§6.3) written and run
      on a stub.
- [ ] Plumbing checklist (§4.1) and review checklist (§4.5) written.
- [ ] Contest base commits built and audited.
- [ ] Documentation snapshots taken, versions pinned.

## 9. Open points

- Who reviews each approach: invited users of each tool, or a different
  model with the checklist?
- Length of the improvement window, and whether improvements after the first
  publication re-open earlier stages.
- Is the plumbing tagging (§4.1) reliable enough by review, or should
  regions be marked in code with comments the script can count?
- Stage switch and notes on the page: per approach only, or also an
  approach switch at the same stage?
