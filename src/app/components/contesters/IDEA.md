# Contest

## What it is

The samples before this point each show one small screen. The contest takes
one **busy internal app** and builds it with different data layers, to see
what each approach costs at the start, what it costs to grow, and what it
gives for free.

The subject is the approach, not who wrote the code. Each approach is
represented by its best implementation, reviewed and improved until nobody
can make it cheaper without breaking a requirement.

## Why it exists

The contest is run by the maintainer of
[statefulObservable](https://github.com/earthdmitriy/rx-evo/tree/master/src/app/submodules/stateful-observable),
the library this site is about. It is the maintainer's attempt to measure it
honestly against what an Angular team would otherwise pick: plain RxJS, NgRx
SignalStore, Angular's own `resource()`.

The contest is built so that every result can be checked, not taken on
trust:

- **The yardstick comes first.** The page, the requirements and the test suite
  are written before the results, and are the same for every approach. A test
  passes or fails; nobody scores it.
- **Every entry gets its best shot.** Each competitor is written idiomatically
  for its tool and fixed over several rounds until what was easy to fix is
  fixed. A failure that comes from the implementation, not the tool, is
  listed as such, apart from the tool's gaps.
- **Claims carry evidence.** Every comparison answers fixed questions with a
  file and line, and code size comes from a script, not from a reading.
- **Where a tool fits is said too.** `resource()` is not built to be a shared
  cache; its page says so, instead of only counting the failures.
- **The steering is stated.** Every contester was written by an agent. Two
  were also steered by hand by the maintainer: statefulObservable, with
  general knowledge of the library applied to this page, and Signals +
  resource(). The other two had no manual steering. Every ruling, for the kit
  and for both, is in a
  [public log](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/steering.md)
  with its reason.

Everything is in the repository: the code, the suite, the reports and the
rules, so any result can be rerun or challenged.

## What the page is optimized for

What an implementation is improved toward, and what the comparison checks.
These are the qualities a busy internal app needs; style and taste are not
on the list.

| Quality | What it means here | How it is checked |
| --- | --- | --- |
| Correct data | Latest input wins, no previous customer's data shown as current, nothing left after logout. | Stage 1 scenarios |
| Robustness | A failure stays in its section or row, Retry asks only for what failed, a failed poll keeps its data, superseded requests are cancelled. | Stage 2 scenarios |
| Fewer requests | Only what is shown is loaded, one request per key, batched ids, cache kept while it is valid, polls only while shown. | Stage 3 scenarios, request counts |
| Responsive UI | Each part shows as soon as its own data arrives; a reload keeps the content, dimmed, instead of blanking it. | Stage 3 scenarios |
| Exact refresh | A write refreshes exactly what it changed, nothing more, nothing less. | Stage 2 and 3 scenarios |
| Less extra code | Fewer lines that are not about the page: caches, batching, status mapping, lifetime. | Line counts (card 06) |
| Cheap growth | Adding one more entity costs few lines in few files. | Cost of one more lookup (card 06) |
| Few places of state | Fewer holders of server data and fewer imperative writers, so less to reset and keep consistent. | Card 07 |

An improvement to any entry is accepted when every required scenario still
passes, the code stays idiomatic for its tool, and it lowers one of these
costs without raising another out of proportion.

## The page it imitates

A shop's internal **support console**, for one role, the support agent. The
agent finds a customer, reads their profile, orders, cart, tickets, notes,
shipments and activity, answers tickets, and edits orders when a ticket asks
for it.

**There is no backend-for-frontend, on purpose.** A perfect BFF would hand
each section exactly the data it shows, and leave a data layer nothing to do.
Real business apps rarely get one, so the backend here is what they usually
talk to: a set of services, each owning its data. That puts the real work on
the client:

- **View-model mapping.** Responses are service DTOs; the views take their own
  view models, so every section maps one to the other.
- **Lookups by id.** A response carries ids of other services' entities, not
  their data: a cart line's name comes from products, its price from pricing,
  a list row's tier from the CRM, a note's author from the agent directory.
- **Several dataflows per section.** A section combines its own source with
  the lookups it needs, and each part loads, fails and recovers on its own.
- **Batch endpoints.** `tiers`, `ticketCounts` and `prices` take up to 20 ids
  per call; the others take one id.
- **Polls, writes and a session.** Notifications and activity poll; writes
  (`updateOrder`, `replyTicket`, `addNote`) change what other sections show;
  logout must leave nothing of the user behind.

## Stages

A page is not written complete: incidents and performance complaints add
requirements over time. Requirements come in three stages:

| Stage | Name | Adds |
| --- | --- | --- |
| 1 | Baseline | Correct data, session and customer isolation, latest input wins, polls, writes with visible results, visible errors. |
| 2 | Robust | Failures isolated per section and row, Retry of only what failed, polled data kept on error, same-key reloads keep content, superseded requests cancelled, exact refresh after writes. |
| 3 | Efficient | Requests only for what is shown, one request per key, cache, debounce, progressive loading, batching, polls only while shown. |

## The test kit

To make the approaches comparable, everything except the data layer is given,
the same for all:

- **A fake data access layer.** The service clients (`src/app/services/contesters`)
  answer from deterministic data after a random delay of up to 5 s, with an
  error switch per service. Tests can hold, release and fail each request and
  count every call, so "one request per key" or "cancelled" is a number, not
  an impression.
- **Dumb presentational components.** Every view of the console (sections,
  rows, panels, the sign-in screen) is a shared component with a fixed view
  model as input and events as output. They fetch nothing and hold no data.
- **Field slots.** A value shown by id that comes from another service (a
  product name, a price, a tier, a counter) is a slot the views render. The
  kit gives its template; the contester fills in how the value is fetched.

So each contester writes only the part in between: the data layer, the
containers that wire it to the views, and the data part of the fields. Any difference in requests, timing or
code size comes from that part.

**The suite** runs every scenario against every contester, in two layers:

- **Page tests** (Vitest): the page mounted against the fake backend, with
  fake timers, for everything that needs no real browser.
- **E2E tests** (Playwright): the same scenario ids in a browser, for routing,
  history and real timing.

Each assertion is tagged with the stage that introduces it. Assertions check
what the user sees and the requests the backend got, never the
implementation. The [Test oracle](/contest/test-oracle) meets every stage and
carries defect switches: for each defect, some scenario must fail, which shows
the suite can tell a broken page from a working one.

## What is measured

- **Tests.** The suite above, run against every contester. Each contester's
  page links its `test_report.md` with every failure in full.
- **Gaps.** What the tool lacks for this page: code the approach had to write
  by hand, workarounds, and requirements it cannot meet
  ([rules](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/gaps.md)).
  Vanilla RxJS is the baseline: everything it has is hand-written.
- **Criteria.** Eight comparisons with fixed answers and code evidence: when a
  request starts, sharing, cancellation, batching, data shown while loading,
  code size, where state lives, refresh after a write
  ([criteria](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/criteria.md)).
  The summary is on the [Results](/contesters/results) page.

## The contesters

- [Vanilla RxJS](/contesters/vanilla-rxjs): RxJS only; the cache, sharing and
  batching are hand-written.
- [NgRx SignalStore](/contesters/signal-store): keyed caches built on
  `withEntities`.
- [Signals + resource()](/contesters/resources): Angular's `resource()` and
  `rxResource()`.
- [statefulObservable](/contesters/stateful-observable): the library this
  site is about.

All four were written by an agent; statefulObservable and Signals +
resource() were also steered by hand.

The [Test oracle](/contest/test-oracle) is not a contester: it validates the
suite (see "The test kit").

## Read more

- [Spec](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/spec.md):
  the page, the backend and the rules for implementers.
- Requirements and scenarios per stage:
  [stage 1](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/stage-1.md),
  [stage 2](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/stage-2.md),
  [stage 3](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/stage-3.md).
- [Methodology](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/methodology.md):
  how the approaches are compared.
