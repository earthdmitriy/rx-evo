import"./chunk-GAL4ENT6.js";var s=`# Results\r
\r
## Summary\r
\r
Run of 2026-11-19, seed 1. Each row is taken from a card in\r
[docs/contest/results](https://github.com/earthdmitriy/rx-evo/tree/master/docs/contest/results),\r
where every answer has its code evidence. What each tool lacks is in the\r
contester's \`gaps.md\`, linked from its page.\r
\r
| | [Vanilla RxJS](/contesters/vanilla-rxjs) | [NgRx SignalStore](/contesters/signal-store) | [Signals + resource()](/contesters/resources) | [statefulObservable](/contesters/stateful-observable) |\r
| --- | --- | --- | --- | --- |\r
| Page tests failed (of 102) | 0 | 6 | 14 | 0 |\r
| E2E failed (of 104) | 0 | 6 | 14 | 0 |\r
| Tool gaps | baseline: all hand-written | keyed cache (DIY), batching (not met) | shared cache and invalidation (against the design), batching (not met) | none |\r
| Extra code, lines | 595 | 416 | 351 | 189 |\r
| Whole data layer, lines | 1668 | 618 | 773 | 301 |\r
| One more batched lookup, lines (files) | 20 (4) | 14 (3), no batching | 30 (3), no batching | 13 (2) |\r
\r
Extra code is the generic and per-entity code: caches, batching, status\r
mapping, lifetime. The tools' own code is not counted.\r
\r
## Failing scenarios\r
\r
- **NgRx SignalStore:** A2, B10, C7, C11, C12, D7. All are batching (R-L9).\r
- **Signals + resource():** batching (A2, B10, C7, C11, C12, D7, D9); a kept\r
  registry entry is not cancelled (B1); cache attempts reverted after they broke\r
  other scenarios (C6, A7); version keys instead of reload (B3, C16); a failed\r
  poll drops the list (E7); notifications poll count (C9, not traced).\r
- **Vanilla RxJS** and **statefulObservable:** none.\r
\r
## By criterion\r
\r
| Criterion | Vanilla RxJS | NgRx SignalStore | Signals + resource() | statefulObservable |\r
| --- | --- | --- | --- | --- |\r
| [01 When a request starts](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/01-eager-or-lazy.md) | on subscribe | on component creation (\`effect\`) | on first read | on subscribe |\r
| Polls stop when the view goes | yes | yes | yes | yes |\r
| [02 One request per key](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/02-request-reuse.md) | helper (250 lines) | helper (81) | per entity (12 registries) | built in |\r
| Cache bound | none | none | none | \`cacheSize\` per factory |\r
| [03 Superseded read](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/03-cancellation.md) | cancelled | cancelled | cancelled for component resources; runs on for registry entries (B1) | cancelled; kept running on purpose for 6 \`refCount: false\` lookups |\r
| [04 Batching](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/04-batching.md) | helper | none | none (cart total only) | configuration |\r
| [05 Key switch](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/05-wipe-data-on-new-request.md) | blank | blank | blank | old data under the spinner |\r
| Same-key reload | kept, dimmed | kept, dimmed | blank (B3) | kept, dimmed |\r
| [07 Server-data holders](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/07-where-state-lives.md) | 32 | 21 | 22 | 21 |\r
| Imperative writers | 33 | 15 | 27 | 14 |\r
| [08 Refresh after a write](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/08-state-invalidation.md) | key invalidation | explicit reload | version bump in the key | explicit reload |\r
| Who names the readers | the write | the write | the readers | the write |\r
\r
Card [06](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/06-boilerplate.md)\r
is the code-size rows of the summary.\r
\r
## How to read it\r
\r
- **Vanilla RxJS** meets everything, at the largest code size: its cache,\r
  sharing and batching are hand-written, and roughly a library's worth of\r
  code.\r
- **NgRx SignalStore** holds state well but does not load it: the keyed cache\r
  is written on top of it, and batching is not.\r
- **Signals + resource()** fits a simple page with no shared data; this page\r
  needs a shared, cached, invalidated layer that \`resource()\` is not built to\r
  be.\r
- **statefulObservable** gets the cache, sharing, cancellation, batching and\r
  session reset from configuration.\r
\r
All four entries were written by an agent. statefulObservable (with\r
[steering](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/steering.md) from the library's maintainer) and Signals + resource() were\r
also steered by hand; Vanilla RxJS and NgRx SignalStore were not.\r
`;export{s as default};
