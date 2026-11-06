# Support console: page tests

The contest scenarios (`e2e/specs/*`) as Vitest tests: the implementation's
root `*Page` component is mounted in TestBed, the fake backend underneath,
and the test drives it through the shared views' test ids and `data-*`
attributes. Same scenario ids and stages as the e2e suite (`H1 · stage 1 · …`).

- `console-page.harness.ts` — `ConsolePage`: the page plus the fake network
  (`release`, `fail`, `settle`, `calls`, `totals`, `truth`) and DOM helpers.
  Synchronous: bodies run in `fakeAsync`, time moves only with `idle(ms)`.
- `scenario.ts` — `PAGE` (the component under test: register an
  implementation's stage here), `scenario`, `signedInScenario`, `withCart`.
- `flows.ts` — shared flows (`prepareOrderEdit`, `searchProducts`, …).
- `*.spec.ts` — 131 scenarios, ported from e2e (A–H, P).
- `page-env.ts` — sets the URL (`?seed&latency=manual&push=off`) before the
  implementation loads; `PAGE_DEFECT=<names>` switches the reference's defects.
- `validate.mjs` — the defect matrix (`npm run pages:validate`): clean run
  passes, each defect fails its scenarios, `stage-1` / `stage-2` keep the
  earlier stages intact.

Run: `npm test` (with everything else) or
`ng test --watch=false --include='src/app/components/contesters/page-tests/**/*.spec.ts'`.

Not covered here, still e2e: A8 at stages 1 and 3 (leave the page and come
back: needs the router and history), real browser timing, the lazy route and
the audit that an implementation only references `ConsolePageComponent`.
