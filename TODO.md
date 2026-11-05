# TODO

## Facelift the demo before linking it from stateful-observable docs

`stateful-observable/docs/compare.md` (section 2, bullet "Lists: pagination, infinite and virtual scroll, expandable rows") describes the samples in `src/app/components/xprerimental/` as "the author's demo application" without a link. Link https://earthdmitriy.github.io/rx-evo/ once the demo is ready to be referenced.

Notes from reading the samples for that bullet:

- [x] Facelift the demo UI.
- [x] `infinite-scroll` and `virtual-scroll`: the `scan` accumulators mutate their seed (`acc.data.push(...)`, `acc.data.splice(...)`, `acc.page = ...`). Make them immutable. In the library, operator state restarts after an error (ADR, "Operators in pipes"); today the accumulated pages probably survive a failed request only because the seed object itself was mutated.
- [x] `with-collapse`: `isExpanded: signal(false)` is created inside `pipeValue(map(...))`, so writable UI state lives inside derived data (and is recreated on every new page). Reviewers of the docs read this as breaking the library's purity story; consider keeping the expanded ids in component state instead.
  - Decided to keep it: a component-level `Set` of ids is mutable state, collides when ids are not unique, and never forgets ids of rows that are gone. The reasoning is in the sample README and in `docs/sample-description.md` → "Decisions (not defects)".
- [ ] Once linked, change the evidence tag in compare.md from *(read, not run)* to point at the live demo.
