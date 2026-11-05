# rx-evo

**Reactive patterns in Angular, from chaos to a deterministic data flow.**

Live demo: https://earthdmitriy.github.io/rx-evo/

rx-evo is a playground that rewrites the same screens over and over. Each
version uses a better reactive pattern than the last. Every sample loads data
through a slow, flaky fake API. That makes the differences easy to see: how a
sample reacts when an input changes, what it shows while loading, how it
handles errors, and whether it shares requests.

Each sample page shows the live demo next to notes on what the pattern does
well, what it does badly, what to try, and which sample fixes it. A
collapsible dataflow diagram of the component sits below the demo.

## The samples

The folders under `src/app/components/` sort alphabetically **from worst to
best**. The sidebar follows the same order.

| # | Group | What changes |
| --- | --- | --- |
| 1 | `legacy` | Promises or subscriptions write into mutable fields from lifecycle hooks |
| 2 | `optimized` | Same imperative shape, with combined requests and cleanup |
| 3 | `pipe` | Data described as streams; the template subscribes |
| 4 | `signals` | Signal inputs and `toSignal`; RxJS for async |
| 5 | `wip` | Value, loading and error travel together: request containers, tiny stores, `rxResource`, `statefulObservable` (the target) |
| 6 | `xprerimental` | Typical real-life list scenarios to assess the final solution: pagination, infinite scroll, virtual scroll, nested requests per row |

`content/` holds shared view components (client card, bucket table, error
box, stateful block, demo controls). It is not a sample.

Client card samples share demo controls. You can switch the client, turn on
auto-increment, hide the bucket, and make each API throw. Every request has a
random delay of up to 5 seconds.

Every flow follows the same pipeline:
**Event Source → Async Mapping → Sync Mapping → Consumer**. See
[docs/fp_article.md](docs/fp_article.md) for the reasoning and
[docs/reactive_patterns/](docs/reactive_patterns/README.md) for how the
pipeline looks on different screens.

## Getting started

```bash
git clone --recurse-submodules https://github.com/earthdmitriy/rx-evo.git
npm install
npm start          # http://localhost:4200
```

If you cloned without submodules, run `git submodule update --init`.
`src/app/submodules/stateful-observable` is the target library.

| Command | |
| --- | --- |
| `npm start` | dev server |
| `npm run build` | production build to `dist/rx-evo` |
| `npm test` | Jest unit tests |
| `npm run deploy` | publish to GitHub Pages |

## Project layout

```
src/app/
  app.routes.ts          routes + sample metadata (title, summary, verdict, tags)
  samples/sample-meta.ts SampleMeta types, route helpers, catalog builders
  layout/                app shell: home page, notes panel, markdown, dataflow diagrams
  components/<group>/<sample>/
    *.component.ts|html  the sample (kept short, no documentation inside)
    *-input-wrapper.*    feeds clientId/showBucket from the demo controls
    README.md            description rendered next to the demo
    *.dataflow.md        generated mermaid dataflow diagram
  services/              fake APIs, event bus, home-grown primitives (tinyStore, rx-utils, resource)
docs/                    article, pattern catalog, style guide, description template
```

## Contributing a sample

1. Create the folder in the group that matches how good the pattern is.
2. Register it in `app.routes.ts` with `sampleRoute(...)`. The sidebar, the
   index page and the previous/next pager are generated from routes.
3. Add a `README.md` using
   [docs/sample-description.md](docs/sample-description.md)
   (Idea / Good / Bad / Try it / Next step).
4. Style it with [docs/style-guide.md](docs/style-guide.md).

Agent and contributor rules are in [AGENTS.md](AGENTS.md).
