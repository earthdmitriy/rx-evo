# Support console: shared views

Every implementation builds the page from these views (docs/contest/spec.md
§2.2, §7). They are the **UI contract**, fixed by UX and product: they take
view models (`view-models.ts`) and emit user intents, and never fetch, cache
or hold data. They never import backend types: producing their view models
from the backend's DTOs is the implementation's job. UI-only state (dropdown
open, edited lines, draft texts, the product search text as typed) lives
inside them. Import from `index.ts`.

## Status is not the views' business

The views take **no status input**. With `null` data they show
nothing, with an empty list their empty text. The page wraps every section
view in a **block** (`src/app/components/content/`), which shows the status:

- `app-spinner-block` `[loading]`: dims the content and draws a spinner;
- `app-view-block` `[loading]`, `[error]`, `(retry)`: the same; when <!-- @s2-line -->
  `error` is set it shows an `app-generic-error` with a Retry button **in <!-- @s2-line -->
  place of** the view. <!-- @s2-line -->

Every block carries `data-testid="state-block"`. Give each block
`data-section="<section>"` (the section ids of spec §7): the tests find a
section by it, and read the block's `loading` class and error and the <!-- @s2-line -->
section root's `data-content` (`shown`, `empty`, `none`). <!-- @s2-line -->
<!-- @s1-alt
section by it, and read the block's `loading` class and the section
root's `data-content` (`shown`, `empty`, `none`).
-->

- **View models carry data only** (`view-models.ts`): no status, and each
  model carries the data of one source. What other services know about the
  things a view shows is NOT inside the rows: it is a separate input of the
  view: a field component by id (next bullet). Nothing to show yet means "has not arrived (or will not)", and the
  view shows the rest meanwhile; `null` is real data ("there is none", for example no linked
  ticket). A missing value renders as an empty space of its usual width, so
  the layout does not jump: no skeleton, no state attribute. Sentences
  (notifications, activity) are written by the view from a kind and
  references, plus the field component of the one name they need. How a page shows
  that something below a section is still loading is up to the implementation;
  the tests read the content (a value shows text, or it is empty).
- **Field components** (`fields.ts`). The shared views render a component by
  id that the implementation supplies, under an injection token with an empty
  default: `PRODUCT_NAME_FIELD` (`sku`, `prefix`), `CUSTOMER_TIER_FIELD`
  (`customerId`), `OPEN_TICKETS_FIELD` (`customerId`, `variant`:
  `row`/`kpi`/`badge`), `KPI_FIELD` (`customerId`, `kind`: `lifetimeSpend`/
  `orders`/`avgOrder`/`orderCount`), `AGENT_NAME_FIELD` (`agentId`),
  `CUSTOMER_NAME_FIELD` (`customerId`, `prefix`), `SHIPMENT_TRACKING_FIELD`
  (`orderId`). The kit ships a skeleton of each
  (`../skeleton/<name>.component.ts`: the inputs above, a finished
  template with its `data-testid` and a spinner block, hardcoded props marked
  TODO for the data and the loading flag). `prefix` is shown only together
  with the value. The header and the tabs views take a `customerId` input
  (the selected customer) for their KPIs and badges. The token only fixes
  the inputs the views set; no signal and no base class is imposed, and how the
  name is fetched is the implementation's choice. The anchors (`data-testid="line-name"`,
  `activity-text`) stay in the views, around the rendered component.
- Section views that come from one source (`app-console-agent`,
  `app-console-customer-header`, `app-console-notifications`) take `Vm | null`;
  `null` shows nothing and the block around them shows the status.
- `ActionState { pending, error }` for writes (`ACTION_IDLE`). <!-- @s2-line -->
<!-- @s1-alt
- `ActionState { pending }` for writes (`ACTION_IDLE`).
-->

## Page

| Selector | Section | Inputs | Outputs |
| --- | --- | --- | --- |
| `app-console-sign-in` | S0 | `state: ActionState` | `signIn: {email, password}` |
| `app-console-frame` | layout | `customerSelected` | `logout` · slots by attribute: `consoleBell`, `consoleAgent`, `consoleList`, `consoleMain`, `consoleRail`, `consolePanel` (put the section's **block** on the slot attribute). The Log out button is the frame's: it is there whatever state the sections are in |
| `app-console-agent` | S1 | `agent: AgentVm \| null` | — |
| `app-console-notifications` | S2 | `notifications: NotificationVm[] \| null` (a reply names its customer with `CUSTOMER_NAME_FIELD`), `markRead: ActionState` | `markAllRead`, `openChange: boolean` (dropdown opened or closed) |
| `app-console-customer-list` | S3 | `page: CustomerPageVm \| null` (tier and open tickets of a row: `CUSTOMER_TIER_FIELD`, `OPEN_TICKETS_FIELD`), `query: CustomerListQuery`, `selectedId` | `queryChange: Partial<CustomerListQuery>` (as typed, not debounced), `select: id` |
| `app-console-customer-header` | S4 | `customerId` (the selected customer), `customer: CustomerHeaderVm \| null` (the KPIs are `KPI_FIELD` and `OPEN_TICKETS_FIELD` by `customerId`) | `clear` |
| `app-console-customer-tabs` | tab card | `active`, `customerId` (the badges are `KPI_FIELD` kind `orderCount` and `OPEN_TICKETS_FIELD` variant `badge`, none until they arrive) | `activeChange` · projects the active tab |
| `app-console-orders-tab` | S5 | `orders: OrderRowVm[] \| null`, `customerId` | `openOrder` |
| `app-console-cart-tab` | S6 | `lines: CartLineVm[] \| null`, `customerId` (name, price, line total and cart total: `PRODUCT_NAME_FIELD`, `PRODUCT_PRICE_FIELD`, `LINE_TOTAL_FIELD`, `CART_TOTAL_FIELD`; the total is empty while any price is missing) | — |
| `app-console-tickets-tab` | S7 | `tickets: TicketRowVm[] \| null`, `customerId` | `openTicket`, `openOrder` |
| `app-console-notes-tab` | S8 | `notes: NoteVm[] \| null` (with `authorId`), `customerId`, `addState` (authors: `AGENT_NAME_FIELD`) | `add: text` |
| `app-console-shipments` | S9 | `rows: ShipmentRow[] \| null`, `customerId` (tracking: `SHIPMENT_TRACKING_FIELD`) | `openOrder` |
| `app-console-activity` | S10 | `entries: ActivityVm[] \| null` (kind and reference), `customerId`; the product name of "Viewed <name>" comes from the product name field | — |
| `app-console-order-panel` | S11 | `orderId`, `order: OrderVm \| null`, `ticket: LinkedTicketVm \| null \| undefined` (`undefined`: not known yet, `null`: none, hides the box), `editing`, `hits: ProductHitVm[] \| null` (null: nothing to show; price, stock and Add of a hit: `PRODUCT_PRICE_FIELD`, `PRODUCT_STOCK_FIELD`, `HIT_ADD_FIELD`; line names: `PRODUCT_NAME_FIELD`), `saveState`, `resendState` | `close`, `editChange`, `search: text` (as typed), `save: {lines, reply?}`, `resend`, `openTicket` |
| `app-console-ticket-panel` | S12 | `ticketId`, `ticket: TicketThreadVm \| null` (messages carry `authorId`; authors: `CUSTOMER_NAME_FIELD`, `AGENT_NAME_FIELD`), `replyState` | `reply: {text, status}`, `openOrder`, `close` |

The panels are `position: fixed` over the page, so the block around them
does not become their positioning context.

Draft texts and edited lines reset when their data changes (a saved note
appears, the thread grows, the order is reloaded or `editing` flips) and
are kept otherwise.

`app-console-controls` is the shell's request panel (speed, counters, Throw
switches); implementations do not use it.
