import"./chunk-GAL4ENT6.js";var s=`# Contest\r
\r
## What it is\r
\r
The samples before this point each show one small screen. The contest takes\r
one **busy internal app** and builds it with different data layers, to see\r
what each approach costs at the start, what it costs to grow, and what it\r
gives for free.\r
\r
The subject is the approach, not who wrote the code. Each approach is\r
represented by its best implementation, reviewed and improved until nobody\r
can make it cheaper without breaking a requirement.\r
\r
## Why it exists\r
\r
The contest is run by the maintainer of\r
[statefulObservable](https://github.com/earthdmitriy/rx-evo/tree/master/src/app/submodules/stateful-observable),\r
the library this site is about. It is the maintainer's attempt to measure it\r
honestly against what an Angular team would otherwise pick: plain RxJS, NgRx\r
SignalStore, Angular's own \`resource()\`.\r
\r
The contest is built so that every result can be checked, not taken on\r
trust:\r
\r
- **The yardstick comes first.** The page, the requirements and the test suite\r
  are written before the results, and are the same for every approach. A test\r
  passes or fails; nobody scores it.\r
- **Every entry gets its best shot.** Each competitor is written idiomatically\r
  for its tool and fixed over several rounds until what was easy to fix is\r
  fixed. A failure that comes from the implementation, not the tool, is\r
  listed as such, apart from the tool's gaps.\r
- **Claims carry evidence.** Every comparison answers fixed questions with a\r
  file and line, and code size comes from a script, not from a reading.\r
- **Where a tool fits is said too.** \`resource()\` is not built to be a shared\r
  cache; its page says so, instead of only counting the failures.\r
- **The steering is stated.** Every contester was written by an agent. Two\r
  were also steered by hand by the maintainer: statefulObservable, with\r
  general knowledge of the library applied to this page, and Signals +\r
  resource(). The other two had no manual steering. Every ruling, for the kit\r
  and for both, is in a\r
  [public log](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/steering.md)\r
  with its reason.\r
\r
Everything is in the repository: the code, the suite, the reports and the\r
rules, so any result can be rerun or challenged.\r
\r
## What the page is optimized for\r
\r
What an implementation is improved toward, and what the comparison checks.\r
These are the qualities a busy internal app needs; style and taste are not\r
on the list.\r
\r
| Quality | What it means here | How it is checked |\r
| --- | --- | --- |\r
| Correct data | Latest input wins, no previous customer's data shown as current, nothing left after logout. | Stage 1 scenarios |\r
| Robustness | A failure stays in its section or row, Retry asks only for what failed, a failed poll keeps its data, superseded requests are cancelled. | Stage 2 scenarios |\r
| Fewer requests | Only what is shown is loaded, one request per key, batched ids, cache kept while it is valid, polls only while shown. | Stage 3 scenarios, request counts |\r
| Responsive UI | Each part shows as soon as its own data arrives; a reload keeps the content, dimmed, instead of blanking it. | Stage 3 scenarios |\r
| Exact refresh | A write refreshes exactly what it changed, nothing more, nothing less. | Stage 2 and 3 scenarios |\r
| Less extra code | Fewer lines that are not about the page: caches, batching, status mapping, lifetime. | Line counts (card 06) |\r
| Cheap growth | Adding one more entity costs few lines in few files. | Cost of one more lookup (card 06) |\r
| Few places of state | Fewer holders of server data and fewer imperative writers, so less to reset and keep consistent. | Card 07 |\r
\r
An improvement to any entry is accepted when every required scenario still\r
passes, the code stays idiomatic for its tool, and it lowers one of these\r
costs without raising another out of proportion.\r
\r
## The page it imitates\r
\r
A shop's internal **support console**, for one role, the support agent. The\r
agent finds a customer, reads their profile, orders, cart, tickets, notes,\r
shipments and activity, answers tickets, and edits orders when a ticket asks\r
for it.\r
\r
**There is no backend-for-frontend, on purpose.** A perfect BFF would hand\r
each section exactly the data it shows, and leave a data layer nothing to do.\r
Real business apps rarely get one, so the backend here is what they usually\r
talk to: a set of services, each owning its data. That puts the real work on\r
the client:\r
\r
- **View-model mapping.** Responses are service DTOs; the views take their own\r
  view models, so every section maps one to the other.\r
- **Lookups by id.** A response carries ids of other services' entities, not\r
  their data: a cart line's name comes from products, its price from pricing,\r
  a list row's tier from the CRM, a note's author from the agent directory.\r
- **Several dataflows per section.** A section combines its own source with\r
  the lookups it needs, and each part loads, fails and recovers on its own.\r
- **Batch endpoints.** \`tiers\`, \`ticketCounts\` and \`prices\` take up to 20 ids\r
  per call; the others take one id.\r
- **Polls, writes and a session.** Notifications and activity poll; writes\r
  (\`updateOrder\`, \`replyTicket\`, \`addNote\`) change what other sections show;\r
  logout must leave nothing of the user behind.\r
\r
## Stages\r
\r
A page is not written complete: incidents and performance complaints add\r
requirements over time. Requirements come in three stages:\r
\r
| Stage | Name | Adds |\r
| --- | --- | --- |\r
| 1 | Baseline | Correct data, session and customer isolation, latest input wins, polls, writes with visible results, visible errors. |\r
| 2 | Robust | Failures isolated per section and row, Retry of only what failed, polled data kept on error, same-key reloads keep content, superseded requests cancelled, exact refresh after writes. |\r
| 3 | Efficient | Requests only for what is shown, one request per key, cache, debounce, progressive loading, batching, polls only while shown. |\r
\r
## The test kit\r
\r
To make the approaches comparable, everything except the data layer is given,\r
the same for all:\r
\r
- **A fake data access layer.** The service clients (\`src/app/services/contesters\`)\r
  answer from deterministic data after a random delay of up to 5 s, with an\r
  error switch per service. Tests can hold, release and fail each request and\r
  count every call, so "one request per key" or "cancelled" is a number, not\r
  an impression.\r
- **Dumb presentational components.** Every view of the console (sections,\r
  rows, panels, the sign-in screen) is a shared component with a fixed view\r
  model as input and events as output. They fetch nothing and hold no data.\r
- **Field slots.** A value shown by id that comes from another service (a\r
  product name, a price, a tier, a counter) is a slot the views render. The\r
  kit gives its template; the contester fills in how the value is fetched.\r
\r
So each contester writes only the part in between: the data layer, the\r
containers that wire it to the views, and the data part of the fields. Any difference in requests, timing or\r
code size comes from that part.\r
\r
**The suite** runs every scenario against every contester, in two layers:\r
\r
- **Page tests** (Vitest): the page mounted against the fake backend, with\r
  fake timers, for everything that needs no real browser.\r
- **E2E tests** (Playwright): the same scenario ids in a browser, for routing,\r
  history and real timing.\r
\r
Each assertion is tagged with the stage that introduces it. Assertions check\r
what the user sees and the requests the backend got, never the\r
implementation. The [Test oracle](/contest/test-oracle) meets every stage and\r
carries defect switches: for each defect, some scenario must fail, which shows\r
the suite can tell a broken page from a working one.\r
\r
## What is measured\r
\r
- **Tests.** The suite above, run against every contester. Each contester's\r
  page links its \`test_report.md\` with every failure in full.\r
- **Gaps.** What the tool lacks for this page: code the approach had to write\r
  by hand, workarounds, and requirements it cannot meet\r
  ([rules](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/gaps.md)).\r
  Vanilla RxJS is the baseline: everything it has is hand-written.\r
- **Criteria.** Eight comparisons with fixed answers and code evidence: when a\r
  request starts, sharing, cancellation, batching, data shown while loading,\r
  code size, where state lives, refresh after a write\r
  ([criteria](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/criteria.md)).\r
  The summary is on the [Results](/contesters/results) page.\r
\r
## The contesters\r
\r
- [Vanilla RxJS](/contesters/vanilla-rxjs): RxJS only; the cache, sharing and\r
  batching are hand-written.\r
- [NgRx SignalStore](/contesters/signal-store): keyed caches built on\r
  \`withEntities\`.\r
- [Signals + resource()](/contesters/resources): Angular's \`resource()\` and\r
  \`rxResource()\`.\r
- [statefulObservable](/contesters/stateful-observable): the library this\r
  site is about.\r
\r
All four were written by an agent; statefulObservable and Signals +\r
resource() were also steered by hand.\r
\r
The [Test oracle](/contest/test-oracle) is not a contester: it validates the\r
suite (see "The test kit").\r
\r
## Read more\r
\r
- [Spec](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/spec.md):\r
  the page, the backend and the rules for implementers.\r
- Requirements and scenarios per stage:\r
  [stage 1](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/stage-1.md),\r
  [stage 2](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/stage-2.md),\r
  [stage 3](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/stage-3.md).\r
- [Methodology](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/methodology.md):\r
  how the approaches are compared.\r
`;export{s as default};
