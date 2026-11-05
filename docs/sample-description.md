# Sample description template

Every sample folder under `src/app/components/<group>/<sample>/` has a
`README.md`. The app loads it lazily (route `readme` in
[`app.routes.ts`](../src/app/app.routes.ts)) and renders it in the notes panel
next to the live demo. The same file reads fine on GitHub.

Sample **code** stays untouched by documentation: no comments added for the
page, no extra fields. Short facts (title, one-line summary, verdict, tags,
related docs) live in route data — `SampleMeta` in
[`sample-meta.ts`](../src/app/samples/sample-meta.ts). Long form lives here.

## Structure

The renderer splits the file on `## ` headings. Known headings get their own
styled card; their order in the panel is fixed, whatever the order in the file.
Unknown headings are rendered as plain sections after the known ones.
The `# Title` line is for GitHub only and is not rendered in the app.

| Heading | Card | Content |
| --- | --- | --- |
| `## Warning` | red, shown first | Optional. One bold sentence for a defect so basic the reader must know it before anything else (e.g. ignores input changes). |
| `## Idea` | neutral | 1–3 sentences: what the sample illustrates and how data flows. |
| `## Scorecard` | table | The seven criteria below, one row each: rating + one-line evidence. |
| `## Good` | green | Bullets: what this step does right / improves over the previous one. |
| `## Bad` | red | Bullets: what is wrong. Name the anti-pattern and what breaks on screen. |
| `## Try it` | blue | Bullets: concrete actions in the demo (toggles, buttons) and what to watch. |
| `## Next step` | neutral | 1–2 sentences + link to the sample that fixes the main "Bad" point. |

> The renderer does not know `## Scorecard` yet: until it does, the table is
> rendered as a plain section after the known ones.

## Assessment criteria

Every sample is rated on the same seven criteria, so samples can be compared
side by side. Rate what the demo **does**, not what the code intends; check
each claim with the demo controls and the **Requests** panel.

**Assess the dataflow, not the template.** The goal is what happens under the
hood: streams, requests, state, errors. If a template fails to use something
the `.ts` already provides (a `reload()` with no Retry button, a missing
`| async`, an error message that is not displayed, a missing `hasValue()`
guard), fix the template instead of listing it as a defect. Template style
(number of `async` pipes, nesting, skeleton or not) is never a criterion.
Only what the underlying code cannot do counts: e.g. "the container has no
`reload()`" is a defect, "the alert has no Retry button" is not.

| # | Criterion | ✅ Pass | ⚠️ Partial | ❌ Fail |
| --- | --- | --- | --- | --- |
| 1 | **Aware of changes** | A new input (`clientId`; filters/page for lists) always ends with the view showing data for the latest input. Older responses can't win (cancelled or ignored). | Reacts, but with a flaw: races can show an older response, or only some blocks follow. | The view ignores new inputs after the first load. |
| 2 | **Loading indicator** | Every load, first and subsequent, is visible per block, e.g. a pending overlay (`.loading`) that keeps stale data on reload. A skeleton is optional and neither required nor credited: it suits single-shot components, not ones whose input changes. | Shown only on the first load, only for some blocks, or by blanking content. | No indicator, or an indicator that is stuck on/off. |
| 3 | **Lazy** | Data is requested only when something displays it: with **Show bucket** off, no bucket/products requests. Shared data (products) is requested once. No duplicate requests per input. | Some waste: a hidden block keeps fetching after it was once shown, products refetched per mount, duplicates on start. | Hidden blocks are always fetched, or every input fires duplicate requests. |
| 4 | **Hold state** | For the same client, toggling **Show bucket** off and on again fires no requests: the loaded bucket and products are kept and shown at once. | Only part is kept (e.g. products shared, bucket refetched). | Every toggle refetches everything the block needs. |
| 5 | **Progressive loading** | Each block renders as soon as its own data arrives; the client card does not wait for bucket/products. | Some blocks wait for unrelated requests, or requests run in a waterfall that could be parallel. | All-or-nothing: nothing renders until every request finished. |
| 6 | **Graceful degradation** | A failed request affects only its block, which shows an error; other blocks keep working. | Failure is isolated, but invisible (stuck spinner/skeleton, empty block), or the error hides unrelated content. | One failure breaks the whole view (endless skeleton, thrown template error). |
| 7 | **Recovery** | After the API is fixed (**Throw** off), the block recovers via **Retry** or the next input, without reloading the page. | Recovers only on the next input change, only for some blocks, or via a workaround (toggling **Show bucket**). | A failed stream stays dead until the page is reloaded. |

Rules:

- Use exactly ✅ / ⚠️ / ❌, or `—` when the criterion does not apply
  (e.g. there is no hidden block on a list screen; then criteria 3–4 are about
  duplicate requests and cached pages instead: revisiting a page or collapsing
  and expanding a row must not refetch).
- Evidence is one line naming the mechanism: "`switchMap` cancels the previous
  request", "`forkJoin` in `ngOnInit` only", "`toSignal` subscribes eagerly".
- A ❌ or ⚠️ must also appear in **Bad** with its visible symptom, and a ✅
  that the previous sample lacked belongs in **Good**.
- How to check:
  1. **Aware of changes** — press **Next client** several times quickly on
     **Slow** API; the card must end on the last id.
  2. **Loading indicator** — watch the first load and a **Next client** reload; a missing skeleton is not a defect.
  3. **Lazy** — turn **Show bucket** off, **Reset counters**, press
     **Next client**: only the Client counter may move. Reopen the page:
     Products should not be requested again if shared.
  4. **Hold state** — with **Autoincrement** off, let the card load, **Reset
     counters**, toggle **Show bucket** off and on: no counter may move.
  5. **Progressive loading** — on **Slow** API, see whether the client card
     appears before the bucket.
  6. **Graceful degradation** — turn on **Throw** for one API at a time.
  7. **Recovery** — turn **Throw** off again, then press **Retry** or
     **Next client**.

## Decisions (not defects)

Design choices made on purpose. Don't list them as **Bad**; a sample that
does the opposite gets it noted in **Bad** as a trade-off, not in **Good**.

- **No automatic retries by default.** Early tooling (`wrapMapRequest`,
  Tiny-store) retried 3 times by default; Tiny-rx-store turned it off.
  Automatic retries work badly against an overloaded backend (they keep
  it down) or a rate limit. Whether to retry is a project decision per
  endpoint, so a primitive should offer it as opt-in, not do it by default.
  A default-on retry *is* worth noting as a trade-off.
- **No caching (`cacheKey`) in client-card samples.** They imitate a common
  entity card that takes the main place on the page; caching is rarely used
  for that, so it is out of scope there. Caching is assessed only where the
  screen calls for it (list samples: revisited pages, re-expanded rows).
- **No cache invalidation actors in list samples.** The mechanics are in
  place (`reload()`, Reload button, `cacheKey`), but nothing in these samples
  changes the data behind a cached page, so there is nothing that should
  invalidate it. "A revisited page shows the data it had when first loaded"
  is not a defect.
- **UI flags of a row live in derived data.** With Collapse creates
  `isExpanded: signal(false)` per row inside `pipeValue(map(...))` instead of
  keeping a `Set` of expanded ids in the component. A `Set` is mutable
  component state, collides when ids are not unique, and keeps ids of rows
  that are gone. Rows start collapsed on every new emission of their page;
  that is intended, not a lost state.
- **Skeletons are optional** (see criterion 2).

## Writing rules

- Plain, short, concrete. One idea per bullet, ≤ 2 lines.
- Use code chips for identifiers: `` `switchMap` ``, `` `ngOnChanges` ``.
- "Bad" names the mechanism *and* the visible symptom:
  "`ngOnInit` runs once → the card never updates when `clientId` changes."
- "Try it" refers to real controls: **Autoincrement**, **Next client**,
  **Show bucket**, **API speed** (Slow/Fast), the **Requests** panel (per-API status, request / failed / cancelled counters, **Throw** switch), list filters, pagination buttons.
- Links to other samples use app paths (`[Stream](/pipe/stream)`); the
  renderer turns them into router navigation. Links to docs/files use full
  GitHub URLs (`https://github.com/earthdmitriy/rx-evo/blob/master/docs/…`) —
  relative paths break inside the app. Related scenario docs are already
  listed from route data, so link docs only when it adds something.
- Don't restate the theory from `docs/fp_article.md`; link it if needed.

## Skeleton

```md
# <Sample title>

## Idea
<What it shows in 1–3 sentences.>

## Scorecard
| Criterion | | Evidence |
| --- | --- | --- |
| Aware of changes | ✅ | `switchMap` on `clientId` cancels the previous request |
| Loading indicator | ⚠️ | … |
| Lazy | ❌ | … |
| Hold state | ⚠️ | … |
| Progressive loading | ✅ | … |
| Graceful degradation | ⚠️ | … |
| Recovery | ❌ | … |

## Good
- …

## Bad
- …

## Try it
- Turn on **Throw** on the Client API — …

## Next step
[<Next sample>](/<group>/<path>) — <what it fixes>.
```
