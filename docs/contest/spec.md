# Support console: implementation spec

You are implementing **one stage** of one page, a shop's internal **support
console**, with the data layer named in your prompt. This file describes the
page and everything provided; the requirements of your stage are in the
stage files you were given. Together they are self-contained.

> This file (and the stage-by-stage, separate-repository workflow it
> describes) is for an external implementer working through
> `make-base.mjs`/`evaluate.mjs`. The five approaches currently in the repo
> (`docs/contest/README.md`'s "Approaches") were not built this way: each is
> one flat folder written in a single pass against the full requirement set
> (`stage-1.md` + `stage-2.md` + `stage-3.md` together), directly in this
> repo — see `docs/contest/README.md`'s "Implementations in the repo". The
> stage-by-stage flow below still works and stays available for a future
> external round.

## 0. How to read your prompt

Your prompt looks like this:

```
read docs/contest/spec.md and docs/contest/stage-1.md … stage-<STAGE>.md
and implement stage <STAGE> of the page
approach: <ROUTE>
use <TOOL> to handle dataflow
you can explore only folders: <EXPLORE…>
forbidden to change: <FORBIDDEN…>
```

| Parameter | Meaning |
| --- | --- |
| `STAGE` | 1, 2 or 3. You implement the requirements of stage files 1…`STAGE`, and nothing beyond them. |
| `ROUTE` | The approach's path segment under the `contesters` group, e.g. `vanilla-rxjs`. Your page is at `/contesters/<ROUTE>/stage-<STAGE>`, your folder is `src/app/components/contesters/<ROUTE>/stage-<STAGE>/`. |
| `TOOL` | The library or approach for **all** state and data handling of the page (sources, caching, derived state, status, writes). Write the best idiomatic version a competent developer would write with it, following its own docs and conventions. Use Angular and RxJS only where `TOOL` itself relies on them or leaves a gap; say which gaps in the README. |
| `EXPLORE` | The only folders you may read. Do not open anything else, even to look for examples. |
| `FORBIDDEN` | Files and folders you must not change. |

The prompt wins over this file. If they conflict, or a requirement cannot be
met within the limits, **stop and report**: do not work around a limit.

## 1. Rules

- **Your code lives in your stage folder**, under one root
  `ConsolePageComponent` (§2.4). For stage 2 and 3 the folder already holds
  a copy of the previous stage: change it from there. Do not
  touch the previous stage's folder. The only edit outside your folder is
  one route entry (§2.3); if that file is forbidden, print the entry in your
  final report.
- **Only your stage.** Meet the requirements of stages 1…`STAGE`. Do not add
  structure, options or code for anything not required yet; write what the
  best version for these requirements looks like.
- **Use the shared kit as is** (§2). Do not copy, fork or patch it. If the
  kit is missing something you need, report it.
- **No imports** from other approaches or other stages (any other folder
  under `contesters/` except `shared/`). A generic helper you need is written
  inside your stage folder.
- **No new dependencies** other than `TOOL` itself, if it is not installed
  yet; report the exact package and version.
- **"Cannot do X" is a valid result.** If `TOOL` cannot meet a requirement,
  leave it unmet and explain why in the README (§11). Never fake a
  requirement: no special cases for tests, test ids or the harness.
- **No writable component state for data.** Components get data from the
  data layer and send user intents to it. Pure UI state (dropdown open,
  textarea text) may live in the component.

## 2. What is provided

### 2.1 Fake backend

`src/app/services/contesters/` (read it; do not change it). Import from its
`index.ts` only; `backend/` is the server side and is not yours to call.

The backend is **a set of services, each owning its data**, as behind a
real shop: there is no backend-for-frontend. Responses carry **ids of
entities owned by other services, not their shape**, and nothing is joined
on the server (the services live in different deployments). Composing what
a section shows from several services is your data layer's job.

- `console.types.ts`: every data type used below.
- One injectable client per service, one method per API key of §4:

  | Client | Service | Methods |
  | --- | --- | --- |
  | `SessionApi` | session | `login`, `logout`, `profile` |
  | `AgentsApi` | agent directory | `agent(id)` |
  | `NotificationsApi` | notifications | `notifications`, `markNotificationsRead`, `push$` |
  | `CustomersApi` | customer search, CRM | `searchCustomers(query)`, `customer(id)`, `tiers(ids)` |
  | `OrdersApi` | orders | `orders`, `orderStats`, `order`, `updateOrder`, `resendConfirmation` |
  | `ShipmentsApi` | shipping | `shipment(orderId)` |
  | `CartApi` | cart | `cart(customerId)` |
  | `ProductsApi` | products | `product(sku)`, `searchProducts(text)` |
  | `PricingApi` | pricing | `prices(skus)` |
  | `InventoryApi` | inventory | `stock(sku)` |
  | `TicketsApi` | tickets | `tickets`, `ticketsByOrder`, `ticketCounts(ids)`, `ticket`, `replyTicket` |
  | `NotesApi` | notes | `notes`, `addNote` |
  | `ActivityApi` | activity | `activity(customerId)` |

- **Batch calls** (only `tiers`, `ticketCounts` and `prices`: the three most
  frequently asked) take **at most `MAX_BATCH` (20) ids**; more is a 400.
  `agent`, `product` and `stock` take one id per call (404 for an unknown
  id). There is no "whole catalog" call: products are fetched by sku or by
  search.
- Every method returns a **cold `Observable`** that emits one value and
  completes, or errors with an `HttpErrorResponse` (401 signed out, 404
  unknown id, 409 conflict, 400 bad input, 500 when a test turns the fault
  on). Promise-based tools wrap it the way their docs recommend.
- **Reads** are cancelled by unsubscribing before the answer (counted as
  cancelled; the server never handles them). **Writes** always reach the
  server once subscribed: unsubscribing only drops the answer, like a real
  HTTP call already sent.
- Every response is a fresh copy; mutating it changes nothing on the server.
- **`NotificationsApi.push$` is hot**: the server emits one `PushEvent` every
  `PUSH_PERIOD_MS` (25 s) while an agent is signed in, whether or not anyone
  listens, with no replay. The event's notification is already stored (the
  next `notifications()` includes it). A `ticket-reply` event has also
  changed that ticket, an `order-delivered` event that order. Push is not a
  request: it has no latency and no counter. No stage requires it.
- Calls are counted and controlled by the test harness (`window.__api`); you
  never call the harness yourself.

### 2.2 Shared views and the UI contract

`src/app/components/contesters/shared/` (read `shared/README.md` first).
The views and their data shapes are **fixed by UX and product**; they do not
follow the backend's shapes, and you do not change them.

- **View models** (`view-models.ts`): the data each view takes, e.g.
  `CustomerRowVm`, `CartLineVm`, `OrderVm`, `ProductHitVm`,
  `TicketThreadVm`. They never import backend types. Producing them from
  the backend's DTOs is your job.
- **Data only, no status; one source per view model.** A view model carries
  no status and the data of one source only. What other services know about
  the things a view shows is not inside the rows: the views show it with
  **field components** (next bullet). A field component that has nothing to
  show yet means "has not arrived (or will not)": the view shows the rest
  meanwhile, with an empty space of the value's usual width. `null` is
  real data ("there is none", e.g. no linked ticket). **Sentences** (activity,
  notifications) are written by the views from a kind and references plus the
  one name they need (rendered by a field component), so the wording is not
  yours to produce. How a page shows that a value below a section is still on
  its way is up to you; only sections have a prescribed state (§7).
- **Field components.** A value shown by an id is a component that the
  **implementation supplies**, so the kit does not force how it is fetched (a
  cached lookup, an independent stream per id, a pipe, a resource ...). The kit
  ships **skeleton** view components with a finished template and a TODO data
  part (`contesters/skeleton`; the stage-1 base holds a copy of each in
  `components/<name>.component.ts`). Each template has its own
  `data-testid` (below) and the `state-block` of the block that wraps it; the
  props marked TODO (`value`/`name`/..., `loading`) you replace with whatever
  you like (a signal, an observable + `async`, a getter ...) and adjust the
  template's bindings. Provide each component under its token (`shared/fields.ts`)
  in the `providers` of `ConsolePageComponent`. The views render them by id;
  without one they show an empty space. A component renders its value as inline
  content and **nothing while the value has not arrived**.

  | Token | Inputs the views set | Visible text | Test id inside | Shown in |
  | --- | --- | --- | --- | --- |
  | `PRODUCT_NAME_FIELD` | `sku`, `prefix` | `<prefix><name>` | `product-name` | cart line, order line, "Viewed <name>" |
  | `CUSTOMER_TIER_FIELD` | `customerId` | `VIP`, `Regular` or `New` as a badge (VIP accent, others neutral) | `field-tier` | list row |
  | `OPEN_TICKETS_FIELD` | `customerId`, `variant` | `row`: red badge with the number, a muted `0` for none; `kpi`: the number; `badge`: the number as a neutral badge | `field-open-tickets` | list row, header KPI, Tickets tab badge |
  | `KPI_FIELD` | `customerId`, `kind` | `lifetimeSpend`/`avgOrder`: `$1,234` (USD, no cents); `orders`: the number; `orderCount`: the number as a neutral badge | `field-kpi` | header KPIs, Orders tab badge |
  | `AGENT_NAME_FIELD` | `agentId` | the agent's name | `field-agent-name` | note author, agent message author |
  | `CUSTOMER_NAME_FIELD` | `customerId`, `prefix` | `<prefix><name>` | `field-customer-name` | customer message author, bell sentence "<ticket>: new message from <name>" |
  | `SHIPMENT_TRACKING_FIELD` | `orderId` | state badge, `ETA <date>`, `<carrier> · <last scan>` | `field-shipment-tracking` | shipments rail |
  | `PRODUCT_PRICE_FIELD` | `sku` | the current price, `$1,234.50` (USD) | `field-product-price` | cart line, search hit |
  | `LINE_TOTAL_FIELD` | `sku`, `qty` | `qty × current price`, `$1,234.50`; nothing until the price is known | `field-line-total` | cart line |
  | `CART_TOTAL_FIELD` | `lines` (`{ sku, qty }[]`) | the sum of `qty × current price`, `$1,234.50`; nothing while the price of any line is missing | `field-cart-total` | cart total |
  | `PRODUCT_STOCK_FIELD` | `sku` | `N in stock`, or `out of stock` for 0 | `field-product-stock` | search hit |
  | `HIT_ADD_FIELD` | `sku`, `onAdd` | the Add button, enabled only when price and stock are known and stock > 0 | `add-<sku>` (the button) | search hit |

  `HIT_ADD_FIELD` is an **action** field: when its button is clicked it calls
  `onAdd({ sku, unitPrice })` with the current price and the view puts the line
  into the draft with that price. It is a callback input, not an `output()`,
  because `ngComponentOutlet` binds inputs only.

  `prefix` is shown only together with the value. The anchors the tests
  read (`row-tier`, `kpi-spend`, `line-name`, `note-author`, `shipment-tracking`
  ...) stay in the views, around the rendered component. The views that show
  the KPIs and the tab badges take a `customerId` input (the selected
  customer); the page passes it.
- **Presentational components** for every section of §3: data in, user
  intents out. They do not fetch, cache or hold data, and they take **no
  status input**: with `null` data they show nothing, with an
  empty list their empty text. UI-only state (dropdown open, edited lines,
  draft texts, the product search text as typed) lives inside them.
- **The console frame:** top bar, section nav (static stub), three-column
  grid with slots, panel container. **The sign-in screen.**
- **Blocks** (`src/app/components/content/`): wrappers that show the
  status of a section around its view. **You wrap every section view in a
  block**; the block, not the view, shows that the section is on its way.
  The blocks your stage may use are named in its stage file:

  | Block | Inputs and outputs |
  | --- | --- |
  | `app-spinner-block` | `[loading]`: the content is dimmed and a spinner drawn over it |
  | `app-view-block` | `[loading]`, `[error]` (shown in place of the content), `(retry)` | <!-- @s2-line -->

  Your data layer maps its own status to the block's inputs (whole
  sections); the blocks and views turn them into DOM the tests can read
  (§7). Field components carry no status the tests read.

### 2.3 Route

Add one entry for your stage to the `contesters` group in
`src/app/app.routes.ts`:

```ts
sampleRoute(
  '<ROUTE>/stage-<STAGE>',
  () => import('./components/contesters/<ROUTE>/stage-<STAGE>/console-page.component').then((m) => m.ConsolePageComponent),
  {
    title: '<TOOL, human name> · stage <STAGE>',
    summary: '<one sentence: how this data layer solves this stage>',
    verdict: 'getting-there',      // or 'target' / 'leaky', by your results
    scenario: 'dashboard',
    layout: 'wide',
    tags: ['<main primitives of TOOL you used>'],
    folder: 'contesters/<ROUTE>/stage-<STAGE>',
    readme: () => import('./components/contesters/<ROUTE>/stage-<STAGE>/README.md').then((m) => m.default),
  },
),
```

### 2.4 Your folder

The route loads **one root component, `ConsolePageComponent`**
(`console-page.component.ts`), in your stage folder. Everything else is
yours to decide: how to split the data layer and the page into services,
stores, container components, pipes and helpers, and where to put them.
Typical subfolders:

```
contesters/<ROUTE>/stage-<STAGE>/
  console-page.component.ts        the root page component (the route's entry)
  services/      data access, stores, caches
  components/    container components between the page and the shared views
  pipes/         view-model mapping, formatting
  utils/         helpers
  tests/         your own unit tests (optional; Vitest, `*.spec.ts`)
  README.md      §11
```

Shared views are used as they are; your containers wire them. Decomposition
is part of what is compared: keep it the way the best version of your
approach would have it.

## 3. The page

A shop's internal support console. One role: **support agent**. Customers
reach support through tickets; the agent reads the customer's data, answers
tickets and changes orders when a ticket asks for it. Everything else in the
back office belongs to other departments.

```
┌ top bar: logo · global search (stub) · notifications (S2) · agent (S1) · Log out ┐
├ section nav (stub): Customers · Catalog🔒 · Inventory🔒 · Promotions🔒 · …        ┤
├──────────────┬──────────────────────────────────────────┬──────────────────────┤
│ S3 Customers │ S4 Customer header + KPIs                │ S9  Shipments        │
│ search,      ├──────────────────────────────────────────┤ S10 Activity         │
│ filters,     │ Tabs: S5 Orders │ S6 Cart │ S7 Tickets │ │                      │
│ sort, pages  │       S8 Notes                           │                      │
└──────────────┴──────────────────────────────────────────┴──────────────────────┘
  panels over the page: S11 Order (view / edit) · S12 Ticket (thread / reply)
  signed out: the whole page is the sign-in screen (S0)
```

The page uses the shell's `layout: 'wide'`. Three columns at a wide demo
area, two (rail under the main column) below that, one on phones. Global
search and the section nav are **static stubs** with no data.

### Sections

What each section shows (its view model) and which services it is composed
from. A field that arrives on its own is noted with its service.

| ID | Section | Shows | Services |
| --- | --- | --- | --- |
| S0 | Sign-in screen | Email, password, Sign in | session (`login`) |
| S1 | Agent | Name, initials, role, Log out | session (`profile`) |
| S2 | Notifications | Unread badge on the bell; dropdown list with a sentence per notification ("T-9003: new message from Iva Homenick", "SO-50017 delivered"), Mark all read | notifications; the text needs the ticket (`ticket` or `tickets`) and the customer name (`customer`) it refers to |
| S3 | Customer list | Search box, filter chips (All / VIP / Open tickets), sort (name, last order, lifetime spend, open tickets; asc/desc), pages of 8. Row: initials, name, email; tier badge and open-tickets badge, each from its own service (the `CUSTOMER_TIER_FIELD` and `OPEN_TICKETS_FIELD` components) | customer search; CRM `tiers(ids)` and tickets `ticketCounts(ids)` per page |
| S4 | Customer header | Profile: name, tier, id, email, city, since. KPIs from their own services: lifetime spend, orders, average order (orders `orderStats`, the `KPI_FIELD` component), open tickets (tickets `ticketCounts`, the `OPEN_TICKETS_FIELD` component) | CRM `customer`; orders; tickets |
| S5 | Orders tab | Order, date, status, items, total. Row opens S11. Tab badge: number of orders (orders `orderStats`) | orders |
| S6 | Cart tab (read-only) | Line: sku, qty; the name from the products service (the product name field) and the price from pricing (the price field); line total (the line total field); cart total (the cart total field) | cart; products (names); pricing (current prices) |
| S7 | Tickets tab | Id, subject, linked order, status, updated. Row opens S12; the order link opens S11. Tab badge: open tickets (tickets `ticketCounts`) | tickets |
| S8 | Notes tab | Internal notes, newest first, author from the agent directory; "Add note" form | notes; agent directory |
| S9 | Shipments in transit | One row per in-flight order: order link, state, ETA, carrier, last scan | orders → shipping, per in-flight order |
| S10 | Recent activity | One sentence per event, newest first, written by the view from the event's kind and reference ("Placed order SO-50017", "Viewed Intelligent sweater, cyan"; a viewed product shows its name with the product name field) | activity; products for `product-viewed` events |
| S11 | Order panel | Linked ticket box (opens S12), status, lines with the name from products, unit price, total, address. **Edit items** while `Processing`: qty ±, remove, add from the product search (hits with price, stock and the Add button from the price, stock and Add fields; Add needs both and stock > 0), price difference, Save (and reply on the linked ticket). Not editable once shipped: **Create return** (stub) | orders (`order`); products (line names); tickets `ticketsByOrder` (the linked ticket: the order does not know it); in the editor: products `searchProducts`, pricing, inventory |
| S12 | Ticket panel | Header, thread with authors from the CRM or the agent directory, reply box with "then set status" (not shown when Solved); link to the order | tickets (`ticket`); CRM (customer authors); agent directory (agent authors) |

## 4. Fake backend

The clients of §2.1 have one method per key below. Data is deterministic
for a seed; every call is counted and controllable by the harness (§8).
"Batch" means at most 20 ids per call.

### Reads

| Key | Service | Input | Returns | Scope |
| --- | --- | --- | --- | --- |
| `profile` | session | — | the signed-in agent: id, name, initials, role | user |
| `agent` | agent directory | `agentId` (one per call) | `{ agentId, name, initials }` | user |
| `notifications` | notifications | — | `{ id, kind, at, unread, customerId, ticketId?, orderId? }[]`, no text | user |
| `customers` | customer search | `{ text, filter, sort, dir, page }` | `{ items: { customerId, name, email }[], total, page, pageSize }` | user |
| `customer` | CRM | `customerId` | profile: name, initials, email, tier, city, since (no counters) | user |
| `tiers` | CRM | customer ids (batch) | `{ customerId, tier }[]` | user |
| `orders` | orders | `customerId` | `OrderRow[]` (id, date, status, items, total) | user |
| `orderStats` | orders | `customerId` | orders, lifetime spend, average order, last order | user |
| `order` | orders | `orderId` | lines `{ sku, qty, unitPrice }[]`, address, payment, shipping; no ticket link | user |
| `shipment` | shipping | `orderId` (in flight only, else 404) | carrier, state, ETA, last scan | user |
| `cart` | cart | `customerId` | `{ sku, qty }[]` | user |
| `product` | products | `sku` (one per call) | `{ sku, name }` | **public** |
| `searchProducts` | products | text | up to 10 `{ sku, name }` | **public** |
| `prices` | pricing | skus (batch) | `{ sku, price }[]` (current price) | **public** |
| `stock` | inventory | `sku` (one per call) | `{ sku, stock }` | **public** |
| `tickets` | tickets | `customerId` | `TicketRow[]` (id, subject, status, updated, `orderId?`) | user |
| `ticketsByOrder` | tickets | `orderId` | the tickets that mention that order | user |
| `ticketCounts` | tickets | customer ids (batch) | `{ customerId, open }[]` | user |
| `ticket` | tickets | `ticketId` | ticket + messages `{ from, authorId, at, text }` (customer id or agent id) | user |
| `notes` | notes | `customerId` | `{ noteId, authorId, at, text }[]` | user |
| `activity` | activity | `customerId` | `{ at, kind, refId }[]` (an order id, sku or ticket id); every call after the first adds an entry | user |

### Writes

| Key | Input | Effect on the backend |
| --- | --- | --- |
| `login` | email, password | starts a session |
| `logout` | — | ends the session |
| `updateOrder` | `orderId`, lines `{ sku, qty }[]`, `reply?: { ticketId, text }` | replaces the lines (existing lines keep their price, new ones get the current price); changes the order, the customer's `orderStats`, stock and activity; with `reply`, appends the message to the ticket and sets it to Waiting |
| `replyTicket` | `ticketId`, text, status | appends a message, sets the status; changes `ticketCounts` |
| `addNote` | `customerId`, text | adds a note |
| `markNotificationsRead` | — | all notifications read |
| `resendConfirmation` | `orderId` | nothing visible |

### Push

| Channel | Emits | Effect already applied on the server |
| --- | --- | --- |
| `push$` (hot) | `PushEvent { kind, notification }` every 25 s while signed in | the notification is stored; `ticket-reply`: the ticket got a customer message and is Open; `order-delivered`: the order is Delivered and has no shipment any more |

**User scope** means the data belongs to the signed-in agent's session.
Products, prices and stock are public: the same for everyone, valid across
sessions (prices and stock can still change).

## 5. Inputs

What the user changes. Everything else on the page follows from these.

| Input | Set by |
| --- | --- |
| `session` | Sign in / Log out |
| `customerQuery` | S3 search text, filter chip, sort, direction, page |
| `selectedCustomer` | S3 row click; ✕ in S4 clears it |
| `activeTab` | Tab click (default Orders) |
| `openPanel` | `{ order: id }` (S5 row, S9 link, S7 order link, S12 link) or `{ ticket: id }` (S7 row, S11 ticket box) or none |
| `editMode` | Edit items / Discard / Save in S11 |
| `notificationsOpen` | Bell click |

Rules:

- A search text, filter or sort change resets the page to 1.
- Selecting another customer closes an open panel and leaves edit mode. The
  active tab is kept.
- Logging out resets every input.

## 6. Requirements and scenarios

Requirements and scenarios are in the stage files you were given
(`stage-1.md` … `stage-<STAGE>.md`). Each stage adds to the earlier ones:
stage *n* must meet everything in stages 1…*n*. Requirements have ids
(`R-…`), scenarios have ids (`A1`, `B2`, …); the same scenario id may appear
in several stage files, each listing only that stage's expectations.

Scenarios run with `?seed=1&latency=manual` (§8): every request stays
pending until the test releases or fails it. "Requests" counts calls per
API key since the step started. Notation: **release** `key` = respond with
data, **fail** `key` = respond with an error, **hold** = keep pending.

## 7. View contract

Blocks and views render the status of a section the same way, so tests
read it from the DOM regardless of the data layer. **Give every block the
attribute `data-section="<section>"`** (the section ids below, e.g.
`<app-spinner-block data-section="tab-cart" …>`): the tests find a
section's block by it, because a block that shows an error no longer <!-- @s2-line -->
contains its view. <!-- @s2-line -->
<!-- @s1-alt
section's block by it.
-->
Every block has `data-testid="state-block"` inside; the tests read:

| What the tests see | Meaning |
| --- | --- |
| the block has class `loading` | a request for the section is on its way (`.loading`: content dimmed, spinner) |
| the block has an `app-generic-error` child | the section failed (`app-view-block`, which then shows the error **instead of** the view); its text names the failed source; its **Retry** button emits `retry` | <!-- @s2-line -->
| the section root's `data-content` is `shown`, `empty` or `none` | the view has data, an empty list (`.empty-state`), or `null` |

From those, a section's state in the scenarios is:

| State | Block `loading` | Block error | `data-content` | <!-- @s2-line -->
| --- | --- | --- | --- | <!-- @s2-line -->
| `idle` | no | no | `none` | <!-- @s2-line -->
| `loading` | yes | no | `none` | <!-- @s2-line -->
| `ready` | no | no | `shown` | <!-- @s2-line -->
| `reloading` | yes | no | `shown` or `empty` | <!-- @s2-line -->
| `empty` | no | no | `empty` | <!-- @s2-line -->
| `error` | any | yes | (the view is gone) | <!-- @s2-line -->
<!-- @s1-alt
| State | Block `loading` | `data-content` |
| --- | --- | --- |
| `idle` | no | `none` |
| `loading` | yes | `none` |
| `ready` | no | `shown` |
| `reloading` | yes | `shown` or `empty` |
| `empty` | no | `empty` |
-->

Nothing below a section has a state attribute. A field that has not
arrived (or whose service failed) is an empty space in its view, and the
tests read the content: a field shows text, or it is empty. <!-- @s2-line -->
S1's agent, S2's list and S4's profile are sections of their own: when their <!-- @s2-line -->
source fails their block shows the error in place of the view, and Log out <!-- @s2-line -->
(the frame's button) stays. <!-- @s2-line -->
<!-- @s1-alt
Nothing below a section has a state attribute. A field that has not
arrived is an empty space in its view, and the tests read the content: a
field shows text, or it is empty.
-->

The shared views already render the test ids below. Your job is to use
those views for every section and control, to wrap every section view in a
block, and to give each the right data; do not render a section's data or
status with your own markup. Test ids:

- Section roots: `data-testid="<section>"`: `signin`, `agent`, `notifications`,
  `customers`, `customer-header`, `tab-orders`, `tab-cart`, `tab-tickets`,
  `tab-notes`, `shipments`, `activity`, `order-panel`, `ticket-panel`.
  Values shown by field components: `row-tier`, `row-open-tickets`,
  `kpi-spend`, `kpi-orders`, `kpi-avg`, `kpi-open-tickets`,
  `tab-<id>-count`, `line-name`, `line-price`, `note-author`,
  `activity-text`, `notification-text`, `shipment-tracking`,
  `message-author`, `hit-price`, `hit-stock`; also `shipment-<orderId>`,
  `order-ticket` (ticket box in S11), `catalog-search`,
  `notifications-body`.
- Content identity: `data-user-id` (S1), `data-customer-id` (S4–S10 content,
  S3 rows), `data-order-id` (S5 rows, S9 rows, S11), `data-ticket-id` (S7
  rows, S12), so tests can find data of the wrong key.
- Controls: `login`, `logout`, `customer-search`, `filter-<name>`,
  `sort`, `sort-dir`, `page-next`, `page-prev`, `customer-<id>`,
  `tab-<name>-toggle`, `order-<id>`, `ticket-<id>`, `edit-items`,
  `add-<sku>`, `qty-inc-<sku>`, `qty-dec-<sku>`, `remove-<sku>`, `save`,
  `discard`, `reply-text`, `reply-status`, `reply-send`, `note-text`,
  `note-add`, `bell`, `mark-all-read`, `close-panel`, `clear-customer`.

## 8. Test harness (what the tests do)

You do not call the harness; knowing it explains the scenarios.

- `?seed=<n>`: deterministic data. `?latency=fast|slow|manual`: with
  `manual` every request stays pending until a test releases or fails it,
  by API key and order.
- The tests count requests per API key (`total`, `ok`, `errors`,
  `cancelled`, `inFlight`) and turn errors on per key.
- Any timing you need (polls, delays) must use regular timers
  (`setTimeout`/`setInterval` or operators built on them), so tests can
  advance the clock.
- Every section and control is found by its test id (§7), state by the DOM
  of §8. Placeholder texts are free.

## 9. Out of scope

- Global search and the section nav (static stubs).
- Create return (button only), Resend confirmation has no visible effect.
- Notification click-through, real-time push, multi-tab sync.
- Concurrent edits by two agents.

## 10. Definition of done

1. `npm run build` passes with no new warnings.
2. The page works at `/contesters/<ROUTE>/stage-<STAGE>?seed=1&latency=slow`:
   every section of §3 renders and every write of §4 works by hand.
3. The smoke tests of your stage pass, against a dev server started from the
   current code:

   ```bash
   E2E_CONTESTER=<ROUTE> E2E_STAGE=<STAGE> npm run e2e:smoke
   ```

   The full suite is run by the evaluator; it checks every requirement of
   your stage files.
4. README written (§11).
5. Nothing changed outside your stage folder and the route entry.

## 11. README

`contesters/<ROUTE>/stage-<STAGE>/README.md`, sections in this order:

```markdown
# <TOOL> · stage <STAGE>

## Idea
How the data layer is shaped: what is a source, how keys, sharing and
status are expressed, where state lives.

## Good
What TOOL made easy in this stage, with requirement ids (R-…).

## Bad
Only two kinds of bullet belong here:
- A requirement or scenario a test actually fails, with its id and the
  visible symptom. Every unmet requirement is here, with the reason.
- Excess, messy or boilerplate code needed to meet a real behavioural
  requirement (progressive loading, graceful degradation, error handling,
  avoiding unnecessary requests, ...), even though everything passes — name
  the requirement and what the code costs to satisfy it.

Not here: a mechanism explanation with nothing failing, a fact inherent to
the language or framework (nothing this implementation could do differently),
a decision already covered in a separate "Decisions" note, a past issue the
code already handles, or anything with no test or requirement id attached.
If a bullet names no failing test and no line of excess code, it is not Bad.

## Requirements
| Requirement | How it is met |
| --- | --- |
| R-… | built in · configuration · helper (`file`) · workaround (`file`, why) · not met (why) |

One row per requirement of your stage file (stage 1: all of stage-1.md;
stage 2 and 3: the new stage's file only).

## Changes from the previous stage
Stage 2 and 3 only: what you restructured and why, in a few bullets.

## Try it
Three or four things to do on the page that show the Good and the Bad.
```

Code size, complexity and other costs are measured by the evaluator; do not
count them yourself.

## 12. Final report

End with a short report: what you built, the smoke result, dependencies
added, anything you had to stop on or could not do, and the route entry if
you could not add it.
