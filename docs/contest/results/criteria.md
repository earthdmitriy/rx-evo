# Review criteria

How to fill `results/0N-*.md`. Written so that a small model can do **one
criterion for one approach** per run, and the runs can be merged into a table
without re-reading the code.

Approaches, in this order everywhere:

| Short name | Folder (`src/app/components/contesters/…`) | Data layer files |
| --- | --- | --- |
| vanilla | `vanilla-rxjs/` | `data/` |
| ngrx-signal-store | `ngrx-signal-store/` | `data/` |
| resources | `resources/` | `data/`, `resources-signed-in.component.ts`, section components that own an `rxResource` |
| stateful-observable | `stateful-observable/` | `sources/`, `utils/`, `vm/` |

Library code (`src/app/submodules/stateful-observable/src`, e.g. `batchFactory.ts`, `batcher.ts`, `cache.ts`; `@ngrx/signals`, Angular
`resource`) is **out of scope for line counts** and **in scope for behaviour**:
if an answer depends on a library default, cite the library file, or answer
`not checked`.

## Rules for every criterion

1. **Pass/fail comes from the test reports, not from reading code.** The
   reports are `<folder>/test_report.md` (and `gaps.md` where it exists). Copy
   the failing scenario ids that belong to the criterion's list. Do not decide
   from code whether a requirement is met.
2. **Code reading answers only "how" and "how much".** Every answer cell
   carries evidence: `path:line` and at most one quoted line. No evidence →
   write `not checked`. Never fill a cell from a README, a comment or another
   approach's result.
3. **Pick from the listed options.** Each card gives fixed answers. If none
   fits, write `other:` plus one sentence; do not invent a new label.
4. **Mechanism uses one scale** (methodology §4.3), the same in every card:

   | Mechanism | Use when |
   | --- | --- |
   | `built in` | A tool feature does it, nothing to configure. |
   | `configuration` | An option of a tool feature (`cacheSize`, `batchTime`, `params`). |
   | `helper (n)` | Generic code written in the approach, `n` = lines of the function/class that does it. |
   | `per-entity (n × k)` | The same code repeated once per entity: `n` lines, `k` copies. |
   | `workaround (n)` | Code that works around the tool; say what it works around. |
   | `none` | Not done. |

   Line counts: non-blank, non-comment lines between the first and last line
   of the code cited. Give the range (`entity-cache.ts:40-121`) so it can be
   rechecked.
5. **Only observable differences.** A difference counts if a scenario, a
   request count or a line count shows it. "Starts one tick later",
   "different block component name", style of code: not a difference, leave
   it out.
6. **No adjectives, no ranking inside a card.** No "correct", "clean",
   "elegant", "best". The verdict section states facts in the form
   "X does A, Y does B"; ordering happens only in the summary table.
7. **Same depth for every approach.** If one approach is checked by running
   or by library source, all four are, or the cell says `not checked` for the
   ones that were not.

## Output of one run (one criterion × one approach)

```md
### <criterion id> · <approach>
| Question | Answer | Evidence |
| --- | --- | --- |
| Q1 … | <option> | `path:line` "quoted line" |
| Mechanism | <scale> | `path:start-end` |
| Failing scenarios (from report) | B1, C6 / none | `test_report.md` |
Notes: ≤ 3 lines, facts only.
```

The merge run puts the four fragments into the criterion file under
`## Per approach`, then writes `## Side by side` (one row per approach, the
columns are the questions) and `## Verdict` (≤ 5 bullet points, each citing a
table cell).

---

## 00 · Baseline

Not a criterion: the list of what all four share, so later cards do not repeat
it. An item goes under **Shared** only if it is true for all four **and** no
report fails a scenario about it. Otherwise it is a criterion (cancellation was
listed as shared while resources fails B1: it is criterion 03).

---

## 01 · When a request starts

Why: a request that starts without a visible consumer is wasted load (R-L2,
R-L1, R-L8). Scenarios: A1, A6, C9 and the stage-3 laziness scenarios in
`stage-3.md` under R-L2.

| Q | Options |
| --- | --- |
| Q1 Trigger | `subscribe` · `first read` (signal/`computed`) · `component creation` · `declaration` |
| Q2 What stops a request when nothing shows the data | `no subscriber` · `template @if` · `params undefined` · `nothing` |
| Q3 Sources that start with no visible consumer | list of source names, or `none` |
| Q4 Polls stop when the view goes | `yes` · `no` · `not checked` (cite where the timer lives) |

Q3 is the comparison; Q1 and Q2 explain it. Where to look: the place each
source is first called; `defer`, `effect(`, `rxResource(`, `params:`,
`timer(`, `interval(`.

Trap: a source created inside a component that is itself under `@if` is
**not** started without consumer. Check the parent template before listing it.

---

## 02 · Sharing one request per key

Why: R-L3, R-L5, R-L6, R-L10. Scenarios: C6, C7, and those listed under these
ids in `stage-3.md`.

| Q | Options |
| --- | --- |
| Q1 Two consumers of the same key share one request | `yes` · `only inside one component` · `no` |
| Q2 What the key is | the expression, quoted (`JSON.stringify(arg)`, `${id}:${version}`) |
| Q3 Cache scope | `component` · `signed-in session` · `app` (per cache; list public caches apart) |
| Q4 What drops a held value | any of `logout` · `last unsubscribe` · `size bound (n)` · `key change` · `never` |
| Q5 Old keys kept after the key changes | `yes` (they stay until Q4) · `no` |

Mechanism: the code that keeps the per-key map.

Trap: eviction and bounds are **not a requirement** (README, open questions).
Report Q4/Q5 as facts; they do not make a scenario fail.

---

## 03 · Cancelling a request nobody waits for

Why: R-C4 (a superseded read is cancelled, not only ignored) and §4.4 leaks.
Scenarios: B1 and those under R-C4, R-L1.

| Q | Options |
| --- | --- |
| Q1 New key for the same view | `cancelled` · `ignored` (answer dropped) · `shown` |
| Q2 Last consumer leaves while in flight | `cancelled` · `runs to the end` |
| Q3 Logout while in flight | `cancelled` · `ignored` · `runs to the end` |
| Q4 Which sources are exceptions | list, or `none` |

Where to look: `switchMap`, `takeUntil`, `finalize`, `unsubscribe`, `abort`,
`rxResource` `params` change.

---

## 04 · Batching

Why: R-L9, R-J3. Endpoints: `tiers`, `ticketCounts`, `prices` (batch, max
`MAX_BATCH` = 20). `agent`, `product`, `stock` are single-id by design and are
not judged here. Scenarios: A2, B10, C7, C11, C12, D7.

Answer **per batch endpoint** (three rows):

| Q | Options |
| --- | --- |
| Q1 Ids asked in the same tick by different consumers | `one call` · `one call per consumer` · `one call per id` |
| Q2 More than 20 ids | `split into chunks` · `one call over the limit` · `cannot happen` (one id per call) |
| Q3 One id fails | `only that id errors` · `the whole batch errors` · `not checked` |

Mechanism per endpoint.

---

## 05 · Data shown while a new request loads

Why: R-C2 (key switch: old data may stay only under the spinner) and R-C3
(same-key reload: data stays dimmed). Scenarios: B3 and those under R-C2,
R-C3.

| Q | Options |
| --- | --- |
| Q1 Key switch (another customer) | `blank` · `old data under spinner` · `old data shown as current` (= defect) |
| Q2 Same-key reload (Retry, poll, refetch after write) | `kept dimmed` · `blank` |
| Q3 Sections that differ from Q1/Q2 | list with their answer, or `none` |

Trap: answer Q1/Q2 from the code path (which state the view gets while
loading), the same way for all four. A README claim is not evidence.

---

## 06 · Code the approach had to write

Why: the cost of the approach; how much of it is machinery a library would
provide. Scope: the data-layer files of the table at the top.

Counting: the rule of `tools/contest/metrics.mjs` (Prettier-formatted,
non-blank, non-comment lines). The script only takes a folder and counts
everything in it, views included; report its folder total as `whole folder`,
then count the data-layer files one by one with the same rule.

Sort **each top-level declaration** (exported `const`, `function`, `class`,
`InjectionToken`), not each file, with this decision list, first match wins:

1. The same call shape is repeated for ≥ 3 entities (e.g. one
   `statefulObservableFactory({...})`, one registry class, one
   `createKeyedCache(...)` per entity), in one file or across files →
   `per-entity`. Count all copies; report `n × k`.
2. Mentions an endpoint, entity or section by name (an `Api` method, a
   raw/view model type, a section name) → `domain`.
3. Otherwise → `generic`.

Type-only declarations (`type`, `interface`) are not counted in any column.

| Q | Answer |
| --- | --- |
| Q1 Lines: generic / per-entity / domain / total | four numbers |
| Q2 What the generic lines do | tick the list: `per-key cache` · `batching` · `ref-counting` · `cancellation` · `polling` · `status/ViewState mapping` · `keep previous` · `write action` |
| Q3 **Cost of one more lookup entity** | lines and files you would add to support a new batched lookup like `tiers`, measured on the existing `tiers` code: list each file and the lines in it that exist only for `tiers` |
| Q4 Dependency | library name and what it does from Q2's list (not counted) |

Q3 is the most comparable number: fixed cost is paid once, Q3 is paid per
feature.

---

## 07 · Where state lives

Why: methodology §4.1 "State spread": every holder is something to reset at
logout and to keep consistent.

List **every state holder** in the data layer and in section components:
`signal(`, `linkedSignal(`, `BehaviorSubject`, `ReplaySubject`, `Subject`,
`shareReplay`, `new Map`, `withState`, `withEntities`, `patchState`,
`rxResource(`, `resource(`, `.set(` / `.next(` on a field.

| Column | Options |
| --- | --- |
| Holder | `path:line` and name |
| Holds | `server data` · `UI state` (selection, tab, search text) · `in-flight bookkeeping` · `write status` |
| Lifetime | `app` · `session` · `customer` · `component` |
| Reset at logout by | the line that resets it, `component destroyed`, or `nothing` |

Then the counts:

| Q | Answer |
| --- | --- |
| Q1 Holders of server data | number |
| Q2 **Files** that read the session or selected customer | number of files, with paths (one file counts once, however many lines read it) |
| Q3 Imperative writers outside source definitions (`next`, `set`, `update`, `patchState`) | number of call sites, with paths; a call inside a library option (`active:`, `params:`) is not a writer |
| Q4 Server-data holders not reset at logout and not public (R-S4) | list, or `none` |

---

## 08 · Refresh after a write

Why: R-W3, R-W10 (exactly the affected keys refresh), R-L7 (cached key
refetched only when a write invalidates it). Scenarios: those under these ids
in `stage-1.md`, `stage-2.md`, `stage-3.md`.

Answer **per write** (`updateOrder`, `replyTicket`, `addNote`,
`markNotificationsRead`, and any other write in `services/contesters/api`):

| Q | Options |
| --- | --- |
| Q1 How readers learn about it | `key invalidation` · `version bump in the key` · `explicit reload call` · `optimistic set` · `whole section refetch` |
| Q2 Keys refreshed | list; mark extra ones (not affected) and missing ones |
| Q3 Who knows the list of readers | `the write` (writer names the readers) · `the readers` (they listen to an event/version) · `the cache` (by key) |
| Q4 Adding one more reader of an affected key needs a change in | `the write` · `nothing else` |
| Q5 Superseded versions | `dropped` · `kept in the cache` (link to 02 Q5) |

Q3/Q4 are the comparison: they say how far a write is coupled to the views.

---

## Running it with a small model

One prompt per cell, e.g.:

```text
Read docs/contest/results/criteria.md, sections "Rules for every criterion",
"Output of one run" and "04 · Batching".
Approach: signal-store (src/app/components/contesters/signal-store).
Answer only that card for that approach, in the output format. Every answer
needs `path:line` evidence or `not checked`. Do not read other approaches.
```

Then one merge prompt per criterion with the four fragments. Check a sample of
evidence lines by hand before merging: a wrong `path:line` means the whole
fragment is redone.
