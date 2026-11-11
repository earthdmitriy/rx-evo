# rx-evo-tools

LLM tool pack for the **rx-evo** workspace: the project-root `npm run <script>`
scripts as allowlisted `ToolHandle`s, so an agent can build / test /
validate — including **one test file at a time** — without a bash tool.
Peer-only pack — no `npm install`, no `.mjs` sidecar.

## Tools

| Tool              | Args                                                   | Runs                       |
| ----------------- | ------------------------------------------------------ | -------------------------- |
| `rx_evo_scripts`  | —                                                      | nothing (returns the list) |
| `rx_evo_run`      | `script` (enum of the argument-free scripts)           | `npm run <script>`         |
| `rx_evo_test`     | —                                                      | `npm run test` (all specs) |
| `rx_evo_test_file`| `file` (one validated test path)                       | that one file              |
| `rx_evo_build`    | —                                                      | `npm run build`            |
| `rx_evo_validate` | `suite`: `e2e` \| `e2e:smoke` \| `e2e:validate` \| `pages:validate` | that suite      |

Every run answers with a capped digest — never a raw log:

```text
npm run build → exit 1
stderr:
<tail of stderr>

stdout:
<tail of stdout>
```

A non-zero exit or a timeout is **returned as text** (`formatCommandResult`,
4 000 characters max). Handlers never throw: a caller mistake comes back as a
short string too.

## Single-file test runs

`rx_evo_test_file` takes one project-relative path and picks the runner by
tree:

| Path                          | Script        | Command                                              |
| ----------------------------- | ------------- | ---------------------------------------------------- |
| `src/**/*.spec.ts`            | `test:file`   | `ng test --watch=false --include=<file>`             |
| `.langflower/nodes/**/*.test.ts` | `test:pack` | `vitest run --config .langflower/nodes/vitest.config.ts <file>` |

The path is **validated before anything is spawned** (`lib/test-targets.ts`):
relative only, `/` separators, characters limited to `A-Z a-z 0-9 . _ - / @`,
no `..` segment, must end with `.spec.ts` / `.test.ts`, must sit in one of the
two test trees. A rejected path never reaches `spawn`, so the "allowlist is a
literal, no free-form shell" rule still holds — the only variables are the
script name and one sanitized path.

## Scripts and exclusions

`lib/scripts.ts` is the single source of truth; it mirrors the **root**
`package.json` (not this pack's) with a summary, a `kind`, a timeout and an
`argsMode` per entry.

- `argsMode: 'none'` — literal; `rx_evo_run` may call it.
- `argsMode: 'file'` — needs one validated path; `rx_evo_run` refuses it and
  points at `rx_evo_test_file`.

Allowed: `build` (300 s), `test`, `test:file`, `test:pack`, `format`,
`e2e:validate`, `pages:validate` (120 s), `e2e`, `e2e:smoke` (300 s).

Excluded, with reasons in `EXCLUSION_REASONS`: `ng` (unconstrained CLI escape
hatch), `start` / `watch` / `test:watch` (never exit — a tool call would hang),
`deploy` (publishes to GitHub Pages; a human decision), and `lint` — the root
`package.json` declares it but `angular.json` has **no `lint` architect
target**, so `npm run lint` fails with *Cannot find 'lint' target* and
`angular-eslint` is not wired as a builder. There is no lint tool in this pack
until an ESLint target is configured.

`lib/scripts.test.ts` reads the real root `package.json` and asserts
`validateAgainstPackageScripts(...)` reports no `missing` and no `extra`, so a
new workspace script fails the test until it is allowlisted or excluded.

## Wiring and reload

Place **rx-evo Tools**, wire its `tools` output into the agent / LLM node's
`tools` input (or a Tool collection). Keep `ctx.projectDir` at the project root
— `npm` always runs with `cwd: ctx.projectDir` and the allowlist is literal.
Reload with `compile_custom_nodes` (Custom → Update).

## Tests

```bash
npm run test:pack                                                  # every pack test
npm run test:pack -- .langflower/nodes/rx-evo-tools/lib/scripts.test.ts   # one file
```

Or from an agent: `rx_evo_test_file`.

The pack `tsconfig.json` excludes `*.test.ts` on purpose: the compile gate
covers non-test files, Vitest runs the tests separately. `.langflower/nodes/vitest.config.ts`
scopes Vitest to `.langflower/nodes/**` (never `src/**`, which belongs to the
Angular unit-test builder) and skips `*.nodes.test.ts`, which needs
`@langflower/node-sdk/testing` from an installed pack — run those after
`npm install` inside that pack.
