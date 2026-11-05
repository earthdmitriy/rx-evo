# Project Agents

## What this project is

rx-evo is an Angular 21 playground that shows the **same screens rewritten
with progressively better reactive patterns** (live demo:
https://earthdmitriy.github.io/rx-evo/). It is a teaching artefact: some
samples are intentionally bad.

- `src/app/components/<group>/<sample>/` — samples. Group folders sort
  alphabetically **worst → best**: `legacy` → `optimized` → `pipe` →
  `signals` → `wip` → `xprerimental` (not a typo: the name sorts after `wip`; do not rename).
  `content/` holds shared view components (client info, bucket, error,
  stateful block, demo controller), not samples.
- Client-card samples come in pairs: `<name>-input-wrapper.component.ts`
  (feeds `clientId`/`showBucket` from `EventBusService`) + `<name>.component.*`
  (the actual sample). List samples (`xprerimental/*`) are routed directly.
- `services/api/*` — fake APIs (faker data, random delay ≤ 5 s, error
  toggles via `EventBusService`). `services/tinyStore`, `services/resource`,
  `services/rx-utils.ts` — home-grown primitives used by `wip/*`.
- `submodules/stateful-observable` — git submodule of the target library
  (also consumed from npm as `@rx-evo/stateful-observable`). Run
  `git submodule update --init` after cloning.
- `layout/` — app shell pieces (home page, notes panel, markdown, dataflow
  diagrams). `samples/sample-meta.ts` — sample metadata types and helpers.
- `docs/` — article, reactive pattern catalog, style guide, description
  template.

## Ground rules

- **Never "fix" a sample's code** unless asked. Bad samples are bad on
  purpose; their README explains what is wrong. A refactor belongs in a
  better-ranked sample, not in place.
- **Sample metadata is not in sample code.** Short facts live in route data
  (`app.routes.ts`, `sampleRoute(...)` with `SampleMeta`); long form in the
  sample folder's `README.md` following
  [`docs/sample-description.md`](docs/sample-description.md). The sidebar,
  index page and pager are generated from the routes.
- **Before writing or reviewing a README**, read "Decisions (not defects)"
  and "Assessment criteria" in `docs/sample-description.md`. Never list a
  recorded decision as **Bad**, and assess the dataflow, not the template.
- **UI follows [`docs/style-guide.md`](docs/style-guide.md):** shared
  component classes from `src/styles.css`, `slate`/`indigo` + semantic
  `emerald`/`rose`/`amber`/`sky` only. Restyling never changes bindings.
- `*.component.dataflow.md` files are generated diagrams — don't hand-edit.
- Adding a sample: folder in the right group → route via `sampleRoute` →
  `README.md` from the template → (optional) dataflow file.

## Commands

- `npm start` — dev server on http://localhost:4200
- `npm run build` — production build (`dist/rx-evo`)
- `npm test` — Jest
- `npm run deploy` — GitHub Pages

## Coding patterns

Coding patterns live in `.opencode/patterns/`. Each file covers one cohesive
group; add new files there rather than appending to this index. They describe
the **target** style (new code, `wip/stateful-observable`, `xprerimental/*`),
not what legacy samples look like.

- `.opencode/patterns/angular-components.md` — reactive inputs, side effects
  in constructor, `inject()` over constructor DI, no writable component state.

# MCP servers
## ts-scan — instant TypeScript intelligence for AI coding agents
**ALWAYS** use MCP `ts-scan` at first when exploring typescript code.
`read`, `glob`, `grep` commands are available only if you provide them the `force=true` argument
