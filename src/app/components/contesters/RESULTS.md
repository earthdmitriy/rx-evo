# Results

## Summary

Run of 2026-11-19, seed 1. Each row is taken from a card in
[docs/contest/results](https://github.com/earthdmitriy/rx-evo/tree/master/docs/contest/results),
where every answer has its code evidence. What each tool lacks is in the
contester's `gaps.md`, linked from its page.

| | [Vanilla RxJS](/contesters/vanilla-rxjs) | [NgRx SignalStore](/contesters/signal-store) | [Signals + resource()](/contesters/resources) | [statefulObservable](/contesters/stateful-observable) |
| --- | --- | --- | --- | --- |
| Page tests failed (of 102) | 0 | 6 | 14 | 0 |
| E2E failed (of 104) | 0 | 6 | 14 | 0 |
| Tool gaps | baseline: all hand-written | keyed cache (DIY), batching (not met) | shared cache and invalidation (against the design), batching (not met) | none |
| Extra code, lines | 595 | 416 | 351 | 189 |
| Whole data layer, lines | 1668 | 618 | 773 | 301 |
| One more batched lookup, lines (files) | 20 (4) | 14 (3), no batching | 30 (3), no batching | 13 (2) |

Extra code is the generic and per-entity code: caches, batching, status
mapping, lifetime. The tools' own code is not counted.

## Failing scenarios

- **NgRx SignalStore:** A2, B10, C7, C11, C12, D7. All are batching (R-L9).
- **Signals + resource():** batching (A2, B10, C7, C11, C12, D7, D9); a kept
  registry entry is not cancelled (B1); cache attempts reverted after they broke
  other scenarios (C6, A7); version keys instead of reload (B3, C16); a failed
  poll drops the list (E7); notifications poll count (C9, not traced).
- **Vanilla RxJS** and **statefulObservable:** none.

## By criterion

| Criterion | Vanilla RxJS | NgRx SignalStore | Signals + resource() | statefulObservable |
| --- | --- | --- | --- | --- |
| [01 When a request starts](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/01-eager-or-lazy.md) | on subscribe | on component creation (`effect`) | on first read | on subscribe |
| Polls stop when the view goes | yes | yes | yes | yes |
| [02 One request per key](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/02-request-reuse.md) | helper (250 lines) | helper (81) | per entity (12 registries) | built in |
| Cache bound | none | none | none | `cacheSize` per factory |
| [03 Superseded read](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/03-cancellation.md) | cancelled | cancelled | cancelled for component resources; runs on for registry entries (B1) | cancelled; kept running on purpose for 6 `refCount: false` lookups |
| [04 Batching](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/04-batching.md) | helper | none | none (cart total only) | configuration |
| [05 Key switch](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/05-wipe-data-on-new-request.md) | blank | blank | blank | old data under the spinner |
| Same-key reload | kept, dimmed | kept, dimmed | blank (B3) | kept, dimmed |
| [07 Server-data holders](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/07-where-state-lives.md) | 32 | 21 | 22 | 21 |
| Imperative writers | 33 | 15 | 27 | 14 |
| [08 Refresh after a write](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/08-state-invalidation.md) | key invalidation | explicit reload | version bump in the key | explicit reload |
| Who names the readers | the write | the write | the readers | the write |

Card [06](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/results/06-boilerplate.md)
is the code-size rows of the summary.

## How to read it

- **Vanilla RxJS** meets everything, at the largest code size: its cache,
  sharing and batching are hand-written, and roughly a library's worth of
  code.
- **NgRx SignalStore** holds state well but does not load it: the keyed cache
  is written on top of it, and batching is not.
- **Signals + resource()** fits a simple page with no shared data; this page
  needs a shared, cached, invalidated layer that `resource()` is not built to
  be.
- **statefulObservable** gets the cache, sharing, cancellation, batching and
  session reset from configuration.

All four entries were written by an agent. statefulObservable (with
[steering](https://github.com/earthdmitriy/rx-evo/blob/master/docs/contest/steering.md) from the library's maintainer) and Signals + resource() were
also steered by hand; Vanilla RxJS and NgRx SignalStore were not.
