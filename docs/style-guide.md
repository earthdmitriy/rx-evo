# UI style guide

The demo UI exists to make data-flow behaviour **visible**: loading, stale
data, errors, retries. Styling serves that; it must never make a sample's
template harder to read than its TypeScript.

Stack: Tailwind CSS v4 (`src/styles.css`, no `tailwind.config.js` theme),
Angular templates. Component `.less` files only hold `:host { display: block; }`
or layout that Tailwind can't express.

## Principles

1. **Short templates.** Use the shared component classes below instead of
   long utility strings. A sample template should read like a data-flow
   diagram, not like a CSS file.
2. **State is visible.** Every async block shows exactly one of: skeleton
   (first load), dimmed stale content + spinner (`.loading`, reload), error
   (`app-generic-error`), value. Don't hide stale data on reload unless the
   sample's point is that it does.
3. **Sample-specific styling lives in the template; shared look lives in
   `styles.css`.** Never restyle a shared class inside a sample.
4. **Don't change behaviour while restyling.** Facelift touches `.html` (and
   at most `host` classes). Bindings, control flow and TS stay as they are,
   bugs included — they are the point of the sample.

## Tokens

| Role | Tailwind palette | Used for |
| --- | --- | --- |
| Base / text | `slate` (50 bg, 200 borders, 500 secondary, 600 body, 900 headings) | everything neutral |
| Accent | `indigo` (600 primary, 50 tints) | primary buttons, links, active nav, focus ring |
| Good | `emerald` | "Good" notes, Target verdict |
| Bad / danger | `rose` | errors, "Bad" notes, Anti-pattern verdict, error toggles |
| Warning | `amber` | "Works, but leaky" verdict |
| Info | `sky` | "Try it" notes, "Getting there" verdict |

- Font: Inter → system UI stack (`font-sans`); code: `font-mono`.
- Base text 15px; secondary `text-sm`; captions and table heads `text-xs`.
- Radius: `rounded-lg` controls, `rounded-xl` cards, `rounded-full` badges.
- Spacing: cards `p-5` (`.card-body`), gaps `gap-3`/`gap-4`/`gap-6`.
- Shadow: `shadow-xs` on cards; `shadow-md` only on hover of clickable cards.
- Numbers in tables: `.num` (right-aligned, tabular).
- No other colours (no `gray-*`, `blue-*`, `green-*`, `red-*`) — migrate them.

## Component classes (`src/styles.css`)

| Class | Use |
| --- | --- |
| `.card`, `.card-header`, `.card-title`, `.card-body` | any panel |
| `.section-title` | small uppercase label above a group |
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost`, `.btn-sm`, `.btn-icon` | buttons |
| `.label`, `.input` | form fields (`<input>`, `<select>`, date) |
| `.switch` + `.switch-track` (+ `.switch-danger`) | boolean toggles (checkbox `peer sr-only` inside) |
| `.table` (+ `.table-hover`) | data tables: `thead th`, `tbody th/td`, `tfoot` are styled |
| `.badge` + `.badge-neutral/-accent/-good/-bad/-warn/-info` | statuses, counts |
| `.code-chip` | inline identifiers |
| `.alert-error` | error box |
| `.skeleton` | pulsing placeholder block (`h-*`, `w-*` for size) |
| `.empty-state` | "no results" row/area |
| `.loading` | **behavioural**: dims children + spinner. Keep existing `[class.loading]` bindings |
| `.prose-sm` | rendered markdown |

Recipes:

```html
<!-- card with header -->
<section class="card">
  <header class="card-header"><h2 class="card-title">Bucket</h2></header>
  <div class="card-body">…</div>
</section>

<!-- toggle -->
<label class="switch">
  <input type="checkbox" class="peer sr-only" [formControl]="ctrl" />
  <span class="switch-track"></span> Show bucket
</label>

<!-- table -->
<table class="table table-hover">
  <thead><tr><th>Name</th><th class="num">Price</th></tr></thead>
  <tbody><tr><th>Tuna</th><td class="num">{{ price | currency }}</td></tr></tbody>
</table>
```

## Page layout (app shell)

```
┌ sidebar (groups → samples, verdict dot) ┬ header: group · step, title, verdict, summary, tags, source
│                                         ├ demo controls (client-card samples only)
│                                         ├ Live demo card (router-outlet) ┬ notes (README cards, docs)
│                                         ├ Component dataflow (collapsible, mermaid)
│                                         └ ← previous / next →
```

- The shell owns everything around the demo. A sample component renders
  only its content: no page titles, no outer padding, no max-width.
- List samples fill the demo card (`flex-1`); virtual scroll needs a
  flex column with a bounded height.
- Mobile (< `lg`): sidebar becomes a drawer; notes stack under the demo
  (< `xl`).

## Accessibility

- Visible focus (`:focus-visible` indigo outline is global).
- Every icon-only button has `aria-label`; decorative icons `aria-hidden`.
- Error boxes keep `role="alert"`.
- Colour is never the only signal: verdict badges carry text, error toggles
  are labelled.
